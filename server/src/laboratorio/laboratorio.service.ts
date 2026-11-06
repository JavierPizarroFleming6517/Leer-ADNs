import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoEvento } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { bytes, extension } from '../common/archivos';
import { ETAPAS_LAB } from '../common/dominio';
import { Ctx } from '../common/sesion';
import { jsonCanonico, sha256 } from '../cripto/cripto';
import { CustodiaService, NOMBRE_EVENTO } from '../custodia/custodia.service';
import { ErrorPerfil, Marcadores, comparar, resumir } from '../genetica/str';
import { NOMBRE_FORMATO, leerArchivo } from '../genetica/lectores';
import { PrismaService } from '../prisma/prisma.service';
import { StickersService } from '../stickers/stickers.service';
import { EtapaDto, RecepcionDto } from './dto/lab.dto';

type Archivo = { nombre: string; datos: Buffer; mime: string };

export function sha256Perfil(m: Marcadores): string {
  return sha256(jsonCanonico(m));
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  xml: 'application/xml',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  json: 'application/json',
  vcf: 'text/plain',
};

@Injectable()
export class LaboratorioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly custodia: CustodiaService,
    private readonly auditoria: AuditoriaService,
    private readonly stickers: StickersService,
  ) {}

  private async sticker(codigo: string) {
    const s = await this.prisma.sticker.findUnique({ where: { codigo }, include: { muestra: true, toma: true, perfil: true } });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    return s;
  }

  private async guardarAdjunto(tx: Prisma.TransactionClient, stickerId: string, etapa: TipoEvento | null, a: Archivo, interpretado: boolean, ctx: Ctx) {
    return tx.archivoAdjunto.create({
      data: {
        stickerId,
        etapa,
        nombre: a.nombre,
        mime: MIME[extension(a.nombre)] ?? 'application/octet-stream',
        tamano: a.datos.length,
        sha256: sha256(a.datos),
        datos: bytes(a.datos),
        interpretado,
        ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
      },
    });
  }

  async recepcion(codigo: string, dto: RecepcionDto, archivo: Archivo | null, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (s.muestra) throw new ConflictException(`El sticker ya fue recibido (muestra ${s.muestra.codigo}).`);
    if (!s.toma || s.estado === 'NUEVO') throw new BadRequestException('El sticker aún no tiene toma ni huellas registradas.');
    const muestra = await this.prisma.$transaction(async (tx) => {
      const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('muestra_correlativo') AS n`;
      const codigoMuestra = `M-${String(n).padStart(6, '0')}`;
      const fecha = ctx.fecha ?? new Date();
      const m = await tx.muestraBiologica.create({
        data: {
          codigo: codigoMuestra,
          stickerId: s.id,
          laboratorio: dto.laboratorio,
          estadoSello: dto.estadoSello,
          etapaActual: 'RECEPCION_LAB',
          etapaDesde: fecha,
          ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
        },
      });
      const adj = archivo ? await this.guardarAdjunto(tx, s.id, 'RECEPCION_LAB', archivo, false, ctx) : null;
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: 'RECEPCION_LAB',
        ctx,
        archivoSha256: adj?.sha256 ?? null,
        detalle: {
          codigoMuestra,
          laboratorio: dto.laboratorio,
          estadoSello: dto.estadoSello,
          observaciones: dto.observaciones ?? null,
          ...(adj ? { archivo: adj.nombre } : {}),
        },
      });
      return m;
    });
    await this.auditoria.registrar(ctx, 'RECEPCION_LAB', { recurso: s.codigo, detalle: { muestra: muestra.codigo, sello: dto.estadoSello } });
    return muestra;
  }

  async etapa(codigo: string, dto: EtapaDto, archivo: Archivo | null, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (!s.muestra) throw new BadRequestException('Primero registra la recepción del sticker en el laboratorio.');
    if (!s.muestra.materialRestante) throw new BadRequestException('La muestra está finalizada: no queda material.');
    const actual = ETAPAS_LAB.indexOf(s.muestra.etapaActual);
    const nueva = ETAPAS_LAB.indexOf(dto.etapa);
    if (nueva !== actual + 1) {
      const esperada = ETAPAS_LAB[actual + 1];
      throw new BadRequestException(
        esperada ? `La siguiente etapa debe ser: ${NOMBRE_EVENTO[esperada]}.` : 'La muestra ya completó todas las etapas.',
      );
    }
    const datos: Prisma.MuestraBiologicaUpdateInput = { etapaActual: dto.etapa, etapaDesde: ctx.fecha ?? new Date() };
    const detalle: Record<string, unknown> = { codigoMuestra: s.muestra.codigo };
    const req = (v: unknown, msg: string) => {
      if (v === undefined || v === null || v === '') throw new BadRequestException(msg);
    };
    switch (dto.etapa) {
      case 'EXTRACCION':
        req(dto.metodo, 'Indica el método de extracción.');
        Object.assign(detalle, { metodo: dto.metodo, equipos: dto.equipos ?? null });
        if (dto.equipos) datos.equipos = dto.equipos;
        break;
      case 'CUANTIFICACION':
        req(dto.adnUgMl, 'Indica la cantidad de ADN (µg/ml).');
        Object.assign(detalle, { adnUgMl: dto.adnUgMl, metodo: dto.metodo ?? null });
        datos.adnUgMl = dto.adnUgMl;
        break;
      case 'AMPLIFICACION': {
        req(dto.kit, 'Indica el kit de amplificación.');
        const kit = await this.prisma.kit.findUnique({ where: { nombre: dto.kit } });
        if (!kit) throw new BadRequestException('El kit no está registrado.');
        Object.assign(detalle, { kit: kit.nombre, loteKit: dto.loteKit ?? null, equipos: dto.equipos ?? null, loci: kit.loci.length });
        datos.kit = kit.nombre;
        datos.loteKit = dto.loteKit ?? null;
        if (dto.equipos) datos.equipos = [s.muestra.equipos, dto.equipos].filter(Boolean).join(' · ');
        break;
      }
      case 'ELECTROFORESIS':
        Object.assign(detalle, { equipos: dto.equipos ?? null });
        if (dto.equipos) datos.equipos = [s.muestra.equipos, dto.equipos].filter(Boolean).join(' · ');
        break;
      case 'INTERPRETACION':
        Object.assign(detalle, { software: dto.software ?? null, analista: dto.analista ?? null });
        break;
    }
    if (dto.tubosAlmacenados !== undefined) {
      datos.tubosAlmacenados = dto.tubosAlmacenados;
      detalle.tubosAlmacenados = dto.tubosAlmacenados;
    }
    if (dto.observaciones) detalle.observaciones = dto.observaciones;

    await this.prisma.$transaction(async (tx) => {
      const adj = archivo ? await this.guardarAdjunto(tx, s.id, dto.etapa, archivo, false, ctx) : null;
      if (adj) Object.assign(detalle, { archivo: adj.nombre, archivoAlmacenado: 'almacenado, no interpretado' });
      await tx.muestraBiologica.update({ where: { id: s.muestra!.id }, data: datos });
      await this.custodia.agregar(tx, { stickerId: s.id, tipo: dto.etapa, ctx, detalle, archivoSha256: adj?.sha256 ?? null });
      await this.stickers.actualizarEstado(tx, s.id);
    });
    await this.auditoria.registrar(ctx, 'ETAPA_LAB', { recurso: s.codigo, detalle: { etapa: dto.etapa } });
    return { ok: true };
  }

  // Archivo de laboratorio guardado sin modificar (.fsa, .hid, PDF, CSV de qPCR, variantes…).
  async adjunto(codigo: string, etapa: TipoEvento | null, archivo: Archivo, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (!s.muestra) throw new BadRequestException('Primero registra la recepción del sticker en el laboratorio.');
    const adj = await this.prisma.$transaction(async (tx) => {
      const a = await this.guardarAdjunto(tx, s.id, etapa ?? s.muestra!.etapaActual, archivo, false, ctx);
      return a;
    });
    await this.auditoria.registrar(ctx, 'ADJUNTAR_ARCHIVO', { recurso: s.codigo, detalle: { sha256: adj.sha256, tamano: adj.tamano } });
    return { id: adj.id, nombre: adj.nombre, sha256: adj.sha256, tamano: adj.tamano, interpretado: false };
  }

  async finalizar(codigo: string, observaciones: string | undefined, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (!s.muestra) throw new BadRequestException('El sticker no está en el laboratorio.');
    if (!s.muestra.materialRestante) throw new ConflictException('La muestra ya está finalizada.');
    await this.prisma.$transaction(async (tx) => {
      await tx.muestraBiologica.update({ where: { id: s.muestra!.id }, data: { materialRestante: false } });
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: s.muestra!.etapaActual,
        ctx,
        detalle: { codigoMuestra: s.muestra!.codigo, materialAgotado: true, observaciones: observaciones ?? 'Sin material remanente en el adhesivo.' },
      });
      await this.stickers.actualizarEstado(tx, s.id);
    });
    await this.auditoria.registrar(ctx, 'FINALIZAR_MUESTRA', { recurso: s.codigo });
    return { ok: true };
  }

  async bandeja() {
    const muestras = await this.prisma.muestraBiologica.findMany({
      orderBy: { etapaDesde: 'asc' },
      include: { sticker: { select: { codigo: true, estado: true, perfil: { select: { id: true } } } } },
    });
    const ahora = Date.now();
    return muestras.map((m) => ({
      codigo: m.codigo,
      sticker: m.sticker.codigo,
      estado: m.sticker.estado,
      laboratorio: m.laboratorio,
      estadoSello: m.estadoSello,
      etapa: m.etapaActual,
      etapaNombre: NOMBRE_EVENTO[m.etapaActual],
      diasEnEtapa: Math.floor((ahora - m.etapaDesde.getTime()) / 86_400_000),
      diasEnLab: Math.floor((ahora - m.createdAt.getTime()) / 86_400_000),
      kit: m.kit,
      tienePerfil: Boolean(m.sticker.perfil),
      materialRestante: m.materialRestante,
    }));
  }

  // ------------------------------------------------------------ Perfil genético

  async perfilesRegistrados(excluirStickerId?: string) {
    const ps = await this.prisma.perfilGenetico.findMany({
      where: excluirStickerId ? { stickerId: { not: excluirStickerId } } : {},
      select: {
        marcadores: true,
        codigoMuestra: true,
        sticker: { select: { id: true, codigo: true, persona: { select: { id: true, nombres: true, apellidos: true } } } },
      },
    });
    return ps.map((p) => ({
      stickerId: p.sticker.id,
      stickerCodigo: p.sticker.codigo,
      codigoMuestra: p.codigoMuestra,
      persona: p.sticker.persona ? { id: p.sticker.persona.id, nombre: `${p.sticker.persona.nombres} ${p.sticker.persona.apellidos}` } : null,
      marcadores: p.marcadores as Marcadores,
    }));
  }

  async coincidencias(m: Marcadores, excluirStickerId?: string) {
    const registrados = await this.perfilesRegistrados(excluirStickerId);
    return registrados
      .map((r) => ({ r, c: comparar(m, r.marcadores) }))
      .filter((x) => x.c.exacta)
      .map(({ r, c }) => ({
        stickerCodigo: r.stickerCodigo,
        codigoMuestra: r.codigoMuestra,
        persona: r.persona,
        lociComparados: c.lociComparados,
        lociIguales: c.lociIguales,
      }));
  }

  validarKit(m: Marcadores, kitNombre: string, loci: string[]) {
    const enKit = new Set(loci);
    const fuera = Object.keys(m).filter((l) => !enKit.has(l));
    if (fuera.length) {
      throw new BadRequestException(
        `El archivo contiene loci que el kit ${kitNombre} no amplifica: ${fuera.join(', ')}. Revisa el kit declarado.`,
      );
    }
    return loci.filter((l) => !m[l]?.length);
  }

  async cargarPerfil(codigo: string, archivo: Archivo, kitElegido: string | undefined, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (!s.muestra) throw new BadRequestException('El sticker no tiene una muestra registrada en el laboratorio.');
    if (s.perfil) throw new ConflictException('Este sticker ya tiene un perfil genético cargado.');
    if (s.muestra.etapaActual !== 'INTERPRETACION') {
      throw new BadRequestException('Registra primero todas las etapas del laboratorio, hasta la interpretación.');
    }

    const rechazar = async (motivo: string, extra: Record<string, unknown> = {}) => {
      await this.auditoria.registrar(ctx, 'PERFIL_RECHAZADO', { recurso: s.codigo, detalle: { motivo, sha256: sha256(archivo.datos), ...extra }, exito: false });
      throw new BadRequestException(motivo);
    };

    let leido;
    try {
      leido = await leerArchivo(archivo.nombre, archivo.datos);
    } catch (e) {
      if (e instanceof ErrorPerfil) return rechazar(e.message);
      throw e;
    }
    // Validación de custodia: el archivo debe ser de la muestra de este sticker.
    const muestra = leido.muestras.find((m) => m.codigoMuestra.trim().toUpperCase() === s.muestra!.codigo);
    if (!muestra) {
      const ids = leido.muestras.map((m) => m.codigoMuestra).slice(0, 5).join(', ');
      return rechazar(
        `El archivo corresponde a otra muestra. Contiene ${ids}; se esperaba ${s.muestra.codigo}, la muestra de este sticker.`,
        { muestrasEnArchivo: leido.muestras.map((m) => m.codigoMuestra).slice(0, 20) },
      );
    }
    const kitNombre = s.muestra.kit ?? kitElegido;
    if (!kitNombre) return rechazar('Indica el kit de amplificación para validar los loci del perfil.');
    if (s.muestra.kit && kitElegido && kitElegido !== s.muestra.kit) {
      return rechazar(`El kit declarado en la amplificación es ${s.muestra.kit}, no ${kitElegido}.`);
    }
    const kit = await this.prisma.kit.findUnique({ where: { nombre: kitNombre } });
    if (!kit) return rechazar('El kit no está registrado.');
    let faltantesKit: string[] = [];
    try {
      faltantesKit = this.validarKit(muestra.marcadores, kit.nombre, kit.loci);
    } catch (e) {
      return rechazar((e as Error).message);
    }

    const resumen = resumir(muestra.marcadores);
    const coincidencias = await this.coincidencias(muestra.marcadores, s.id);
    const hashArchivo = sha256(archivo.datos);

    await this.prisma.$transaction(async (tx) => {
      const adj = await this.guardarAdjunto(tx, s.id, 'PERFIL_CARGADO', archivo, true, ctx);
      await tx.perfilGenetico.create({
        data: {
          stickerId: s.id,
          codigoMuestra: s.muestra!.codigo,
          marcadores: muestra.marcadores,
          kit: kit.nombre,
          formatoOrigen: leido.formato,
          archivoId: adj.id,
          archivoSha256: adj.sha256,
          ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
        },
      });
      await tx.muestraBiologica.update({ where: { id: s.muestra!.id }, data: { etapaActual: 'PERFIL_CARGADO', etapaDesde: ctx.fecha ?? new Date() } });
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: 'PERFIL_CARGADO',
        ctx,
        archivoSha256: hashArchivo,
        detalle: {
          codigoMuestra: s.muestra!.codigo,
          archivo: archivo.nombre,
          formato: NOMBRE_FORMATO[leido.formato],
          kit: kit.nombre,
          codis: `${resumen.codisPresentes}/20`,
          loci: resumen.totalLoci,
          sha256PerfilCanonico: sha256Perfil(muestra.marcadores),
          coincidenciasEnRegistro: coincidencias.map((c) => c.stickerCodigo),
        },
      });
    });
    await this.auditoria.registrar(ctx, 'PERFIL_CARGADO', { recurso: s.codigo, detalle: { sha256: hashArchivo, coincidencias: coincidencias.length } });
    return {
      codigoMuestra: s.muestra.codigo,
      formato: NOMBRE_FORMATO[leido.formato],
      kit: kit.nombre,
      resumen,
      faltantesKit,
      coincidencias,
      archivoSha256: hashArchivo,
    };
  }

  async archivo(id: string, ctx: Ctx) {
    const a = await this.prisma.archivoAdjunto.findUnique({ where: { id }, include: { sticker: { select: { codigo: true } } } });
    if (!a) throw new NotFoundException('El archivo no existe.');
    await this.auditoria.registrar(ctx, 'DESCARGAR_ARCHIVO', { recurso: a.sticker?.codigo ?? id, detalle: { sha256: a.sha256 } });
    return a;
  }
}
