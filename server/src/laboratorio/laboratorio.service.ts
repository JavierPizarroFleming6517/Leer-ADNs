// El laboratorio es EXTERNO a TrazaGen: la plataforma registra el envío del sticker y recibe el
// resultado (perfil STR) con su archivo original. No registra las etapas internas del laboratorio.
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { bytes, extension } from '../common/archivos';
import { exigirVigente } from '../common/dominio';
import { Ctx } from '../common/sesion';
import { jsonCanonico, sha256 } from '../cripto/cripto';
import { CustodiaService } from '../custodia/custodia.service';
import { ErrorPerfil, Marcadores, comparar, resumir } from '../genetica/str';
import { ArchivoLeido, NOMBRE_FORMATO, leerArchivo } from '../genetica/lectores';
import { PrismaService } from '../prisma/prisma.service';
import { StickersService } from '../stickers/stickers.service';

type Archivo = { nombre: string; datos: Buffer; mime: string };

// Validación de custodia: el archivo del laboratorio debe traer la muestra de ESTE sticker.
// El SPECIMENID (o nombre de muestra en la planilla) es el código del sticker, TG-XXXX-XXXX.
export function muestraDelArchivo(leido: ArchivoLeido, codigoSticker: string) {
  const m = leido.muestras.find((x) => x.codigoMuestra.trim().toUpperCase() === codigoSticker.toUpperCase());
  if (!m) {
    const ids = leido.muestras.map((x) => x.codigoMuestra).slice(0, 5).join(', ');
    throw new ErrorPerfil(`El archivo corresponde a otra muestra. Contiene ${ids}; se esperaba ${codigoSticker}, el código de este sticker.`);
  }
  return m;
}

// Los loci del archivo deben ser del kit declarado. Devuelve los loci del kit sin dato.
export function lociFueraDeKit(m: Marcadores, loci: string[]) {
  const enKit = new Set(loci);
  // Sin cromosoma Y (amelogenina solo X) no se esperan marcadores Y-STR como DYS391.
  const sinY = Boolean(m.AMEL?.length) && !m.AMEL.includes('Y');
  return {
    fuera: Object.keys(m).filter((l) => !enKit.has(l)),
    faltantes: loci.filter((l) => !m[l]?.length && !(sinY && /^DYS/i.test(l))),
  };
}

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
    const s = await this.prisma.sticker.findUnique({
      where: { codigo },
      include: { perfil: true, toma: true, eventos: { where: { tipo: 'ENVIO' }, orderBy: { secuencia: 'desc' }, take: 1 } },
    });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    exigirVigente(s);
    return { ...s, envio: s.eventos[0] ?? null };
  }

  async cargarPerfil(codigo: string, archivo: Archivo, opciones: { kit: string; laboratorio?: string; materialRestante?: boolean }, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (!s.envio) throw new BadRequestException('Registra primero el envío del sticker al laboratorio.');
    if (s.perfil) throw new ConflictException('Este sticker ya tiene un perfil genético cargado.');

    const rechazar = async (motivo: string, extra: Record<string, unknown> = {}): Promise<never> => {
      await this.auditoria.registrar(ctx, 'PERFIL_RECHAZADO', { recurso: s.codigo, detalle: { motivo, sha256: sha256(archivo.datos), ...extra }, exito: false });
      throw new BadRequestException(motivo);
    };

    let leido: ArchivoLeido;
    try {
      leido = await leerArchivo(archivo.nombre, archivo.datos);
    } catch (e) {
      if (e instanceof ErrorPerfil) return rechazar(e.message);
      throw e;
    }
    let muestra;
    try {
      muestra = muestraDelArchivo(leido, s.codigo);
    } catch (e) {
      return rechazar((e as Error).message, { muestrasEnArchivo: leido.muestras.map((m) => m.codigoMuestra).slice(0, 20) });
    }
    const kit = await this.prisma.kit.findUnique({ where: { nombre: opciones.kit } });
    if (!kit) return rechazar('El kit no está registrado.');
    const { fuera, faltantes } = lociFueraDeKit(muestra.marcadores, kit.loci);
    if (fuera.length) {
      return rechazar(`El archivo contiene loci que el kit ${kit.nombre} no amplifica: ${fuera.join(', ')}. Revisa el kit declarado.`);
    }

    const laboratorio = opciones.laboratorio?.trim() || String((s.envio.detalle as { destino?: string }).destino ?? 'Laboratorio externo');
    const materialRestante = opciones.materialRestante !== false;
    const resumen = resumir(muestra.marcadores);
    const coincidencias = await this.coincidencias(muestra.marcadores, s.id);
    const hashArchivo = sha256(archivo.datos);

    await this.prisma.$transaction(async (tx) => {
      const adj = await tx.archivoAdjunto.create({
        data: {
          stickerId: s.id,
          etapa: 'PERFIL_CARGADO',
          nombre: archivo.nombre,
          mime: MIME[extension(archivo.nombre)] ?? 'application/octet-stream',
          tamano: archivo.datos.length,
          sha256: hashArchivo,
          datos: bytes(archivo.datos),
          interpretado: true,
          ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
        },
      });
      await tx.perfilGenetico.create({
        data: {
          stickerId: s.id,
          codigoMuestra: muestra.codigoMuestra.trim().toUpperCase(),
          marcadores: muestra.marcadores,
          kit: kit.nombre,
          laboratorio,
          materialRestante,
          formatoOrigen: leido.formato,
          archivoId: adj.id,
          archivoSha256: adj.sha256,
          ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
        },
      });
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: 'PERFIL_CARGADO',
        ctx,
        archivoSha256: hashArchivo,
        detalle: {
          laboratorio,
          archivo: archivo.nombre,
          formato: NOMBRE_FORMATO[leido.formato],
          kit: kit.nombre,
          codis: `${resumen.codisPresentes}/20`,
          loci: resumen.totalLoci,
          materialRestante,
          sha256PerfilCanonico: sha256Perfil(muestra.marcadores),
          coincidenciasEnRegistro: coincidencias.map((c) => c.stickerCodigo),
        },
      });
      await this.stickers.actualizarEstado(tx, s.id);
    });
    await this.auditoria.registrar(ctx, 'PERFIL_CARGADO', { recurso: s.codigo, detalle: { sha256: hashArchivo, coincidencias: coincidencias.length } });
    return { codigoMuestra: s.codigo, formato: NOMBRE_FORMATO[leido.formato], kit: kit.nombre, laboratorio, resumen, faltantesKit: faltantes, coincidencias, archivoSha256: hashArchivo };
  }

  // El laboratorio informa que ya no queda material en el adhesivo: el sticker pasa a Finalizado.
  async materialAgotado(codigo: string, observaciones: string | undefined, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (!s.perfil) throw new BadRequestException('El sticker aún no tiene el resultado del laboratorio.');
    if (!s.perfil.materialRestante) throw new ConflictException('El laboratorio ya informó que no queda material.');
    await this.prisma.$transaction(async (tx) => {
      await tx.perfilGenetico.update({ where: { id: s.perfil!.id }, data: { materialRestante: false } });
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: 'MATERIAL_AGOTADO',
        ctx,
        detalle: { laboratorio: s.perfil!.laboratorio, observaciones: observaciones?.trim() || 'Sin material remanente en el adhesivo.' },
      });
      await this.stickers.actualizarEstado(tx, s.id);
    });
    await this.auditoria.registrar(ctx, 'MATERIAL_AGOTADO', { recurso: s.codigo });
    return { ok: true };
  }

  // Otros archivos del laboratorio (.fsa, .hid, PDF del informe, CSV de qPCR…): se guardan sin modificar, sin interpretar.
  async adjunto(codigo: string, archivo: Archivo, ctx: Ctx) {
    const s = await this.sticker(codigo);
    if (!s.envio) throw new BadRequestException('Registra primero el envío del sticker al laboratorio.');
    const a = await this.prisma.archivoAdjunto.create({
      data: {
        stickerId: s.id,
        etapa: 'PERFIL_CARGADO',
        nombre: archivo.nombre,
        mime: MIME[extension(archivo.nombre)] ?? 'application/octet-stream',
        tamano: archivo.datos.length,
        sha256: sha256(archivo.datos),
        datos: bytes(archivo.datos),
        interpretado: false,
      },
    });
    await this.auditoria.registrar(ctx, 'ADJUNTAR_ARCHIVO', { recurso: s.codigo, detalle: { sha256: a.sha256, tamano: a.tamano } });
    return { id: a.id, nombre: a.nombre, sha256: a.sha256, tamano: a.tamano, interpretado: false };
  }

  // ------------------------------------------------------------ Comparación de perfiles

  async perfilesRegistrados(excluirStickerId?: string) {
    const ps = await this.prisma.perfilGenetico.findMany({
      where: { sticker: { anuladoEn: null }, ...(excluirStickerId ? { stickerId: { not: excluirStickerId } } : {}) },
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

  async archivo(id: string, ctx: Ctx) {
    const a = await this.prisma.archivoAdjunto.findUnique({ where: { id }, include: { sticker: { select: { codigo: true } } } });
    if (!a) throw new NotFoundException('El archivo no existe.');
    await this.auditoria.registrar(ctx, 'DESCARGAR_ARCHIVO', { recurso: a.sticker?.codigo ?? id, detalle: { sha256: a.sha256 } });
    return a;
  }
}
