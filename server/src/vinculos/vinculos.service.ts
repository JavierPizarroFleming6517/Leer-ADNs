import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { DEDOS, exigirVigente } from '../common/dominio';
import { Ctx } from '../common/sesion';
import { jsonCanonico, sha256 } from '../cripto/cripto';
import { CriptoService } from '../cripto/cripto.service';
import { CustodiaService } from '../custodia/custodia.service';
import { leerArchivo } from '../genetica/lectores';
import { Marcadores } from '../genetica/str';
import { sha256Perfil } from '../laboratorio/laboratorio.service';
import { PrismaService } from '../prisma/prisma.service';

export type DocumentoVinculo = {
  tipo: 'TrazaGen/VinculoDactilogenetico';
  version: 1;
  sticker: string;
  personaId: string;
  huellas: { posicion: number; sha256Imagen: string; sha256Plantilla: string }[];
  perfil: { codigoMuestra: string; kit: string; sha256Canonico: string; sha256Archivo: string };
  firmadoEn: string;
  firmadoPor: { id: string; nombre: string; rol: string };
};

export type Comprobacion = { clave: string; nombre: string; ok: boolean; detalle: string };

@Injectable()
export class VinculosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cripto: CriptoService,
    private readonly custodia: CustodiaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private async datos(codigo: string) {
    const s = await this.prisma.sticker.findUnique({
      where: { codigo },
      include: {
        huellas: { orderBy: { posicion: 'asc' }, select: { posicion: true, imagenOriginal: true, plantilla: true, sha256Imagen: true, sha256Plantilla: true } },
        perfil: { include: { archivo: true } },
      },
    });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    return s;
  }

  // El vínculo es un documento canónico firmado con Ed25519: sticker + persona + hashes de huellas + hash del perfil.
  async firmar(codigo: string, ctx: Ctx) {
    const s = await this.datos(codigo);
    exigirVigente(s);
    if (!s.personaId) throw new BadRequestException('El sticker no tiene una persona asociada.');
    if (!s.huellas.length) throw new BadRequestException('El sticker no tiene huellas digitalizadas.');
    if (!s.perfil) throw new BadRequestException('El sticker no tiene un perfil genético cargado.');
    const fecha = ctx.fecha ?? new Date();
    const doc: DocumentoVinculo = {
      tipo: 'TrazaGen/VinculoDactilogenetico',
      version: 1,
      sticker: s.codigo,
      personaId: s.personaId,
      huellas: s.huellas.map((h) => ({ posicion: h.posicion, sha256Imagen: h.sha256Imagen, sha256Plantilla: h.sha256Plantilla })),
      perfil: {
        codigoMuestra: s.perfil.codigoMuestra,
        kit: s.perfil.kit,
        sha256Canonico: sha256Perfil(s.perfil.marcadores as Marcadores),
        sha256Archivo: s.perfil.archivoSha256,
      },
      firmadoEn: fecha.toISOString(),
      firmadoPor: { id: ctx.usuario.id, nombre: ctx.usuario.nombre, rol: ctx.usuario.rol },
    };
    const documento = jsonCanonico(doc);
    const firma = this.cripto.firmador.firmar(documento).toString('base64');
    const docSha = sha256(documento);

    const v = await this.prisma.$transaction(async (tx) => {
      // Si se regenera, el anterior queda revocado: nunca se borra.
      const revocados = await tx.vinculoDactilogenetico.updateMany({
        where: { stickerId: s.id, estado: 'VIGENTE' },
        data: { estado: 'REVOCADO', revocadoEn: fecha },
      });
      const v = await tx.vinculoDactilogenetico.create({
        data: {
          stickerId: s.id,
          personaId: s.personaId!,
          documento,
          documentoSha256: docSha,
          firma,
          llavePublica: this.cripto.firmador.publicaB64,
          firmadoPorId: ctx.usuario.id,
          firmadoEn: fecha,
          ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
        },
      });
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: 'VINCULO_FIRMADO',
        ctx,
        detalle: {
          vinculoId: v.id,
          algoritmo: 'Ed25519',
          sha256Documento: docSha,
          huellas: doc.huellas.length,
          codigoMuestra: doc.perfil.codigoMuestra,
          revocaAnteriores: revocados.count,
        },
      });
      return v;
    });
    await this.auditoria.registrar(ctx, 'FIRMAR_VINCULO', { recurso: s.codigo, detalle: { vinculoId: v.id, sha256: docSha } });
    return this.vista(v);
  }

  vista(v: { id: string; estado: string; documento: string; documentoSha256: string; firma: string; llavePublica: string; firmadoEn: Date; revocadoEn: Date | null }) {
    return {
      id: v.id,
      estado: v.estado,
      documento: JSON.parse(v.documento) as DocumentoVinculo,
      documentoCanonico: v.documento,
      documentoSha256: v.documentoSha256,
      firma: v.firma,
      llavePublica: v.llavePublica,
      llavePublicaPem: this.cripto.firmador.publicaPem(),
      firmadoEn: v.firmadoEn,
      revocadoEn: v.revocadoEn,
    };
  }

  // Recalcula todo desde la base y dice qué cambió.
  async verificar(codigo: string, ctx: Ctx | null, registrar = true) {
    const s = await this.datos(codigo);
    const v = await this.prisma.vinculoDactilogenetico.findFirst({ where: { stickerId: s.id, estado: 'VIGENTE' }, orderBy: { firmadoEn: 'desc' } });
    if (!v) throw new NotFoundException('El sticker no tiene un vínculo vigente.');
    const r = await this.comprobar(s, v);
    if (ctx && registrar) {
      await this.custodia.agregarSolo({
        stickerId: s.id,
        tipo: 'VERIFICACION',
        ctx,
        detalle: { tipo: 'INTEGRIDAD_VINCULO', vinculoId: v.id, resultado: r.valido ? 'ÍNTEGRO' : 'ALTERADO', fallas: r.comprobaciones.filter((c) => !c.ok).map((c) => c.clave) },
      });
      await this.auditoria.registrar(ctx, 'VERIFICAR_VINCULO', { recurso: s.codigo, detalle: { valido: r.valido }, exito: r.valido });
    }
    return { ...r, vinculoId: v.id, verificadoEn: new Date().toISOString() };
  }

  async comprobar(
    s: Awaited<ReturnType<VinculosService['datos']>>,
    v: { documento: string; documentoSha256: string; firma: string; llavePublica: string; personaId: string },
  ) {
    const c: Comprobacion[] = [];
    const cambios: { campo: string; antes: string; ahora: string }[] = [];

    const firmaOk = this.cripto.firmador.verificar(v.documento, Buffer.from(v.firma, 'base64'), v.llavePublica);
    c.push({ clave: 'firma', nombre: 'Firma Ed25519 del documento', ok: firmaOk, detalle: firmaOk ? 'La firma corresponde al documento canónico.' : 'La firma no corresponde al documento: el documento o la firma fueron modificados.' });
    const llaveOk = v.llavePublica === this.cripto.firmador.publicaB64;
    c.push({ clave: 'llave', nombre: 'Llave pública de TrazaGen', ok: llaveOk, detalle: llaveOk ? 'Firmado con la llave vigente de la plataforma.' : 'Firmado con una llave que no es la de esta plataforma.' });
    const hashOk = sha256(v.documento) === v.documentoSha256;
    c.push({ clave: 'documento', nombre: 'Hash del documento', ok: hashOk, detalle: hashOk ? 'SHA-256 del documento sin cambios.' : 'El SHA-256 del documento no coincide.' });

    let doc: DocumentoVinculo;
    try {
      doc = JSON.parse(v.documento);
    } catch {
      c.push({ clave: 'formato', nombre: 'Formato del documento', ok: false, detalle: 'El documento no es JSON válido.' });
      return { valido: false, comprobaciones: c, cambios };
    }

    const personaOk = doc.personaId === s.personaId && v.personaId === s.personaId;
    c.push({ clave: 'persona', nombre: 'Persona vinculada', ok: personaOk, detalle: personaOk ? 'El sticker sigue asociado a la misma persona.' : 'El sticker ahora apunta a otra persona.' });
    if (!personaOk) cambios.push({ campo: 'Persona del sticker', antes: doc.personaId, ahora: s.personaId ?? '—' });

    // Huellas: se recalcula el SHA-256 de la imagen original y de la plantilla desde los bytes guardados.
    const actuales = new Map(s.huellas.map((h) => [h.posicion, h]));
    let huellasOk = doc.huellas.length === s.huellas.length;
    if (!huellasOk) cambios.push({ campo: 'Cantidad de huellas', antes: String(doc.huellas.length), ahora: String(s.huellas.length) });
    for (const h of doc.huellas) {
      const a = actuales.get(h.posicion);
      const img = a ? sha256(Buffer.from(a.imagenOriginal)) : '—';
      const pl = a ? sha256(Buffer.from(a.plantilla)) : '—';
      if (img !== h.sha256Imagen) {
        huellasOk = false;
        cambios.push({ campo: `Imagen de huella · ${DEDOS[h.posicion]}`, antes: h.sha256Imagen, ahora: img });
      }
      if (pl !== h.sha256Plantilla) {
        huellasOk = false;
        cambios.push({ campo: `Plantilla de huella · ${DEDOS[h.posicion]}`, antes: h.sha256Plantilla, ahora: pl });
      }
    }
    c.push({ clave: 'huellas', nombre: `Huellas (${doc.huellas.length})`, ok: huellasOk, detalle: huellasOk ? 'Imágenes y plantillas idénticas a las firmadas.' : 'Al menos una huella cambió desde la firma.' });

    // Perfil genético: hash canónico actual vs. firmado; si difiere, se compara con el archivo original del laboratorio.
    let perfilOk = Boolean(s.perfil);
    if (s.perfil) {
      const actual = sha256Perfil(s.perfil.marcadores as Marcadores);
      const archivoActual = sha256(Buffer.from(s.perfil.archivo.datos));
      if (actual !== doc.perfil.sha256Canonico) {
        perfilOk = false;
        cambios.push({ campo: 'Perfil STR canónico (SHA-256)', antes: doc.perfil.sha256Canonico, ahora: actual });
        try {
          const leido = await leerArchivo(s.perfil.archivo.nombre, Buffer.from(s.perfil.archivo.datos));
          const original = leido.muestras.find((m) => m.codigoMuestra.toUpperCase() === s.perfil!.codigoMuestra)?.marcadores;
          if (original) {
            const actualM = s.perfil.marcadores as Marcadores;
            for (const locus of new Set([...Object.keys(original), ...Object.keys(actualM)])) {
              const a = (original[locus] ?? []).join(', ') || '—';
              const b = (actualM[locus] ?? []).join(', ') || '—';
              if (a !== b) cambios.push({ campo: `Locus ${locus}`, antes: `${a} (archivo del laboratorio)`, ahora: `${b} (base de datos)` });
            }
          }
        } catch {
          // El archivo original no se pudo leer: basta con la diferencia de hash.
        }
      }
      if (archivoActual !== doc.perfil.sha256Archivo || s.perfil.archivoSha256 !== doc.perfil.sha256Archivo) {
        perfilOk = false;
        cambios.push({ campo: 'Archivo del laboratorio (SHA-256)', antes: doc.perfil.sha256Archivo, ahora: archivoActual });
      }
    }
    c.push({ clave: 'perfil', nombre: 'Perfil genético', ok: perfilOk, detalle: perfilOk ? 'Perfil STR y archivo de origen idénticos a los firmados.' : 'El perfil genético cambió desde la firma.' });

    return { valido: c.every((x) => x.ok), comprobaciones: c, cambios };
  }

  // Revisión de todos los vínculos vigentes, para las alertas del inicio.
  async revisarTodos() {
    const vs = await this.prisma.vinculoDactilogenetico.findMany({ where: { estado: 'VIGENTE' }, include: { sticker: { select: { codigo: true } } } });
    const invalidos: { sticker: string; fallas: string[] }[] = [];
    for (const v of vs) {
      const s = await this.datos(v.sticker.codigo);
      const r = await this.comprobar(s, v);
      if (!r.valido) invalidos.push({ sticker: v.sticker.codigo, fallas: r.comprobaciones.filter((c) => !c.ok).map((c) => c.nombre) });
    }
    return { total: vs.length, invalidos };
  }
}
