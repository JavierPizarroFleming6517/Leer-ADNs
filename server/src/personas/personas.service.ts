import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Persona, Prisma, Rol } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { bytes } from '../common/archivos';
import { exigirVigente } from '../common/dominio';
import { DEDOS, ocultaDocumento, puedeVerDocumentoCompleto } from '../common/dominio';
import { Ctx } from '../common/sesion';
import { CriptoService } from '../cripto/cripto.service';
import { CustodiaService } from '../custodia/custodia.service';
import { PrismaService } from '../prisma/prisma.service';
import { StickersService } from '../stickers/stickers.service';
import { sha256 } from '../cripto/cripto';
import { ConsentimientoDto, EnvioDto, PersonaDto, TomaDto } from './dto/persona.dto';

export function enmascarar(doc: string): string {
  const visibles = doc.length > 5 ? 3 : 1;
  return '•'.repeat(Math.max(3, doc.length - visibles)) + doc.slice(-visibles);
}

@Injectable()
export class PersonasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cripto: CriptoService,
    private readonly custodia: CustodiaService,
    private readonly auditoria: AuditoriaService,
    private readonly stickers: StickersService,
  ) {}

  // Proyección de la persona según el rol: el documento y la fecha completa solo los ve el admin.
  vista(p: Persona, rol: Rol) {
    const doc = this.cripto.descifrar(p.numeroDocumentoCifrado);
    const nac = p.fechaNacimientoCifrada ? this.cripto.descifrar(p.fechaNacimientoCifrada) : null;
    return {
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      tipoDocumento: p.tipoDocumento,
      documento: puedeVerDocumentoCompleto(rol) ? doc : ocultaDocumento(rol) ? null : enmascarar(doc),
      documentoVisible: puedeVerDocumentoCompleto(rol) ? 'completo' : ocultaDocumento(rol) ? 'oculto' : 'enmascarado',
      pais: p.pais,
      nacionalidad: p.nacionalidad,
      fechaNacimiento: puedeVerDocumentoCompleto(rol) ? nac : null,
      anioNacimiento: nac && !ocultaDocumento(rol) ? nac.slice(0, 4) : null,
      sexoDeclarado: p.sexoDeclarado,
      institucion: p.institucion,
      createdAt: p.createdAt,
    };
  }

  async crear(dto: PersonaDto, ctx: Ctx, tx: Prisma.TransactionClient = this.prisma) {
    const indice = this.cripto.indiceDocumento(dto.tipoDocumento, dto.numeroDocumento, dto.pais);
    const existe = await tx.persona.findUnique({ where: { documentoIndiceCiego: indice }, select: { id: true } });
    if (existe) {
      throw new ConflictException({
        message: 'Ya existe una persona registrada con ese documento. Usa "Buscar existente".',
        personaId: existe.id,
      });
    }
    if (dto.fechaNacimiento && new Date(dto.fechaNacimiento) > new Date()) {
      throw new BadRequestException('La fecha de nacimiento no puede ser futura.');
    }
    return tx.persona.create({
      data: {
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        tipoDocumento: dto.tipoDocumento,
        numeroDocumentoCifrado: this.cripto.cifrar(dto.numeroDocumento.trim().toUpperCase()),
        documentoIndiceCiego: indice,
        pais: dto.pais.trim(),
        nacionalidad: dto.nacionalidad.trim(),
        fechaNacimientoCifrada: dto.fechaNacimiento ? this.cripto.cifrar(dto.fechaNacimiento.slice(0, 10)) : null,
        sexoDeclarado: dto.sexoDeclarado ?? null,
        institucion: dto.institucion?.trim() || null,
        ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
      },
    });
  }

  // Búsqueda exacta por documento usando el índice ciego (sin descifrar la tabla).
  async buscarPorDocumento(tipo: string, numero: string, pais: string, ctx: Ctx) {
    const indice = this.cripto.indiceDocumento(tipo, numero, pais);
    const p = await this.prisma.persona.findUnique({
      where: { documentoIndiceCiego: indice },
      include: { stickers: { select: { codigo: true, estado: true } } },
    });
    await this.auditoria.registrar(ctx, 'BUSCAR_PERSONA_DOCUMENTO', { recurso: 'personas', detalle: { encontrada: Boolean(p) } });
    if (!p) return { encontrada: false as const };
    return { encontrada: true as const, persona: this.vista(p, ctx.usuario.rol), stickers: p.stickers };
  }

  async listar(q: string | undefined, ctx: Ctx) {
    const where: Prisma.PersonaWhereInput = {};
    const texto = q?.trim().slice(0, 80);
    if (texto) {
      // Si parece un documento, se busca por índice ciego en todos los tipos y países conocidos.
      const indices: string[] = [];
      if (/\d{3,}/.test(texto)) {
        const combos = await this.prisma.persona.findMany({ select: { tipoDocumento: true, pais: true }, distinct: ['tipoDocumento', 'pais'] });
        for (const c of combos) indices.push(this.cripto.indiceDocumento(c.tipoDocumento, texto, c.pais));
      }
      where.OR = [
        { nombres: { contains: texto, mode: 'insensitive' } },
        { apellidos: { contains: texto, mode: 'insensitive' } },
        ...(indices.length ? [{ documentoIndiceCiego: { in: indices } }] : []),
      ];
    }
    const personas = await this.prisma.persona.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        stickers: { select: { codigo: true, estado: true, vinculos: { where: { estado: 'VIGENTE' }, select: { id: true } } } },
        consentimientos: { select: { id: true } },
      },
    });
    await this.auditoria.registrar(ctx, 'CONSULTA_PERSONAS', { recurso: 'personas', detalle: { filtro: Boolean(texto), resultados: personas.length } });
    return personas.map((p) => ({
      ...this.vista(p, ctx.usuario.rol),
      stickers: p.stickers.map((s) => ({ codigo: s.codigo, estado: s.estado, vinculado: s.vinculos.length > 0 })),
      consentimientos: p.consentimientos.length,
    }));
  }

  // ------------------------------------------------------------ Sticker ↔ persona

  // Un sticker se vincula una sola vez. Un segundo intento se bloquea y queda en auditoría.
  async asociar(codigo: string, dto: { personaId?: string; nueva?: PersonaDto }, ctx: Ctx) {
    const s = await this.stickers.porCodigo(codigo);
    exigirVigente(s);
    if (s.personaId) {
      await this.auditoria.registrar(ctx, 'INTENTO_REVINCULAR_STICKER', { recurso: s.codigo, exito: false });
      throw new ConflictException('Este sticker ya está vinculado a una persona. Un sticker se vincula una sola vez.');
    }
    if (!dto.personaId && !dto.nueva) throw new BadRequestException('Indica una persona existente o los datos de una nueva.');
    const persona = await this.prisma.$transaction(async (tx) => {
      const p = dto.personaId
        ? await tx.persona.findUnique({ where: { id: dto.personaId } })
        : await this.crear(dto.nueva!, ctx, tx);
      if (!p) throw new NotFoundException('La persona no existe.');
      const r = await tx.sticker.updateMany({
        where: { id: s.id, personaId: null },
        data: { personaId: p.id, vinculadoEn: ctx.fecha ?? new Date() },
      });
      if (r.count !== 1) throw new ConflictException('Este sticker ya está vinculado a una persona.');
      return p;
    });
    await this.auditoria.registrar(ctx, 'ASOCIAR_PERSONA', { recurso: s.codigo, detalle: { nueva: !dto.personaId } });
    return this.vista(persona, ctx.usuario.rol);
  }

  async consentimiento(codigo: string, dto: ConsentimientoDto, archivo: { nombre: string; datos: Buffer }, ctx: Ctx) {
    const s = await this.stickers.porCodigo(codigo);
    exigirVigente(s);
    if (!s.personaId) throw new BadRequestException('Primero asocia una persona al sticker.');
    const hash = sha256(archivo.datos);
    const c = await this.prisma.consentimiento.create({
      data: {
        personaId: s.personaId,
        versionTexto: dto.versionTexto,
        fechaFirma: new Date(dto.fechaFirma),
        entidadRevisora: dto.entidadRevisora,
        archivoNombre: archivo.nombre,
        archivoSha256: hash,
        archivo: bytes(archivo.datos),
        ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
      },
    });
    await this.auditoria.registrar(ctx, 'SUBIR_CONSENTIMIENTO', { recurso: s.codigo, detalle: { sha256: hash } });
    return { id: c.id, versionTexto: c.versionTexto, fechaFirma: c.fechaFirma, entidadRevisora: c.entidadRevisora, archivoNombre: c.archivoNombre, archivoSha256: hash };
  }

  async toma(codigo: string, dto: TomaDto, ctx: Ctx) {
    const s = await this.prisma.sticker.findUnique({
      where: { codigo },
      include: { toma: true, lote: { include: { plantilla: true } }, huellas: { select: { posicion: true } } },
    });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    exigirVigente(s);
    if (!s.personaId) throw new BadRequestException('Primero asocia una persona al sticker.');
    if (s.toma) throw new ConflictException('La toma de este sticker ya fue registrada.');
    const posiciones = s.lote.plantilla.posiciones;
    const vistos = new Set<number>();
    for (const d of dto.dedosNoObtenibles) {
      if (!posiciones.includes(d.posicion)) throw new BadRequestException(`El dedo ${d.posicion} no está en la plantilla de este sticker.`);
      if (vistos.has(d.posicion)) throw new BadRequestException('Hay un dedo repetido en los no obtenibles.');
      if (s.huellas.some((h) => h.posicion === d.posicion)) throw new BadRequestException(`${DEDOS[d.posicion]} ya tiene una huella cargada.`);
      vistos.add(d.posicion);
    }
    const fechaHora = new Date(dto.fechaHora);
    if (fechaHora.getTime() > Date.now() + 5 * 60_000) throw new BadRequestException('La fecha de la toma no puede ser futura.');
    await this.prisma.$transaction(async (tx) => {
      await tx.tomaMuestra.create({
        data: {
          stickerId: s.id,
          personaId: s.personaId!,
          fechaHora,
          lugar: dto.lugar.trim(),
          operadorId: ctx.usuario.id,
          observaciones: dto.observaciones?.trim() || null,
          dedosNoObtenibles: dto.dedosNoObtenibles.map((d) => ({ posicion: d.posicion, dedo: DEDOS[d.posicion], motivo: d.motivo.trim() })),
          ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
        },
      });
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: 'TOMA',
        ctx,
        detalle: {
          lugar: dto.lugar.trim(),
          fechaHora: fechaHora.toISOString(),
          operador: ctx.usuario.nombre,
          dedosNoObtenibles: dto.dedosNoObtenibles.map((d) => ({ posicion: d.posicion, motivo: d.motivo.trim() })),
        },
      });
      await this.stickers.actualizarEstado(tx, s.id);
    });
    await this.auditoria.registrar(ctx, 'REGISTRAR_TOMA', { recurso: s.codigo });
    return { ok: true };
  }

  async envio(codigo: string, dto: EnvioDto, ctx: Ctx) {
    const s = await this.prisma.sticker.findUnique({
      where: { codigo },
      include: { toma: true, _count: { select: { huellas: true } }, eventos: { where: { tipo: 'ENVIO' }, select: { id: true }, take: 1 } },
    });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    exigirVigente(s);
    if (!s.toma || !s._count.huellas) throw new BadRequestException('Registra la toma y al menos una huella antes de enviar el sticker al laboratorio.');
    if (s.eventos.length) throw new ConflictException('El envío de este sticker al laboratorio ya fue registrado.');
    await this.custodia.agregarSolo({
      stickerId: s.id,
      tipo: 'ENVIO',
      ctx,
      detalle: { destino: dto.destino, transportista: dto.transportista ?? null, sello: dto.sello ?? null },
    });
    await this.auditoria.registrar(ctx, 'REGISTRAR_ENVIO', { recurso: s.codigo });
    return { ok: true };
  }

  async archivoConsentimiento(id: string, ctx: Ctx) {
    const c = await this.prisma.consentimiento.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('El consentimiento no existe.');
    await this.auditoria.registrar(ctx, 'DESCARGAR_CONSENTIMIENTO', { recurso: id });
    return c;
  }
}
