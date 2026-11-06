import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrigenHuella, Prisma } from '@prisma/client';
import { AfisService } from '../afis/afis.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { bytes, tipoImagen } from '../common/archivos';
import { DEDOS } from '../common/dominio';
import { Ctx } from '../common/sesion';
import { sha256 } from '../cripto/cripto';
import { CustodiaService } from '../custodia/custodia.service';
import { PrismaService } from '../prisma/prisma.service';
import { StickersService } from '../stickers/stickers.service';

export type Coincidente = {
  huellaId: string;
  stickerCodigo: string;
  posicion: number;
  dedo: string;
  puntaje: number;
  persona: { id: string; nombre: string } | null;
};

@Injectable()
export class HuellasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly afis: AfisService,
    private readonly custodia: CustodiaService,
    private readonly auditoria: AuditoriaService,
    private readonly stickers: StickersService,
  ) {}

  // Busca una plantilla contra todas las huellas registradas (1:N real en SourceAFIS).
  async buscar(plantilla: Buffer, excluirStickerId?: string) {
    const candidatas = await this.prisma.huella.findMany({
      where: excluirStickerId ? { stickerId: { not: excluirStickerId } } : {},
      select: { id: true, plantilla: true },
    });
    const r = await this.afis.identificar(
      plantilla,
      candidatas.map((c) => ({ id: c.id, plantilla: Buffer.from(c.plantilla) })),
    );
    const top = r.results.slice(0, 5);
    const info = await this.prisma.huella.findMany({
      where: { id: { in: top.map((t) => t.id) } },
      select: {
        id: true,
        posicion: true,
        ancho: true,
        alto: true,
        sticker: { select: { id: true, codigo: true, persona: { select: { id: true, nombres: true, apellidos: true } } } },
      },
    });
    const porId = new Map(info.map((i) => [i.id, i]));
    const mejores = top.map((t) => {
      const h = porId.get(t.id)!;
      return {
        huellaId: t.id,
        stickerId: h.sticker.id,
        stickerCodigo: h.sticker.codigo,
        posicion: h.posicion,
        dedo: DEDOS[h.posicion],
        ancho: h.ancho,
        alto: h.alto,
        puntaje: t.score,
        coincide: t.match,
        persona: h.sticker.persona ? { id: h.sticker.persona.id, nombre: `${h.sticker.persona.nombres} ${h.sticker.persona.apellidos}` } : null,
      };
    });
    return { umbral: r.threshold, candidatas: candidatas.length, millis: r.millis, mejores };
  }

  async subir(
    codigo: string,
    p: { posicion: number; origen: OrigenHuella; dpi: number; nombre: string; datos: Buffer },
    ctx: Ctx,
  ) {
    const s = await this.prisma.sticker.findUnique({
      where: { codigo },
      include: { lote: { include: { plantilla: true } }, toma: true, huellas: { select: { posicion: true } } },
    });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    if (!s.personaId) throw new BadRequestException('Primero asocia una persona al sticker.');
    if (!s.lote.plantilla.posiciones.includes(p.posicion)) {
      throw new BadRequestException(`${DEDOS[p.posicion] ?? 'Esa posición'} no está en la plantilla de este sticker.`);
    }
    if (s.huellas.some((h) => h.posicion === p.posicion)) {
      throw new ConflictException(`${DEDOS[p.posicion]} ya tiene una huella registrada. Las huellas no se reemplazan.`);
    }
    const noObt = (s.toma?.dedosNoObtenibles as { posicion: number }[] | undefined) ?? [];
    if (noObt.some((d) => d.posicion === p.posicion)) {
      throw new BadRequestException(`${DEDOS[p.posicion]} fue declarado no obtenible en la toma.`);
    }
    const mime = tipoImagen(p.datos);
    if (!mime) throw new BadRequestException('La imagen debe ser PNG, JPEG o TIFF.');

    // Extracción real con el DPI declarado (SourceAFIS no es invariante a escala).
    const ex = await this.afis.extraer(p.datos, p.dpi);
    if (!ex.png) throw new BadRequestException('No se pudo decodificar la imagen.');
    if (ex.minutiaCount < 8) {
      throw new BadRequestException(
        `Se detectaron solo ${ex.minutiaCount} minucias. La imagen no tiene calidad suficiente; vuelve a digitalizar la huella.`,
      );
    }
    const plantilla = Buffer.from(ex.template, 'base64');
    const busqueda = await this.buscar(plantilla, s.id);
    const duplicados = busqueda.mejores.filter((m) => m.coincide);
    const shaImagen = sha256(p.datos);

    const huella = await this.prisma.$transaction(async (tx) => {
      const h = await tx.huella.create({
        data: {
          stickerId: s.id,
          posicion: p.posicion,
          archivoNombre: p.nombre,
          mimeOriginal: mime,
          imagenOriginal: bytes(p.datos),
          imagenPng: bytes(Buffer.from(ex.png!, 'base64')),
          sha256Imagen: shaImagen,
          dpi: Math.round(p.dpi),
          origen: p.origen,
          ancho: ex.width,
          alto: ex.height,
          plantilla: bytes(plantilla),
          sha256Plantilla: sha256(plantilla),
          cantidadMinucias: ex.minutiaCount,
          minucias: ex.minutiae as unknown as Prisma.InputJsonValue,
          ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
        },
      });
      for (const d of duplicados) {
        await tx.coincidenciaHuella.create({
          data: { huellaId: h.id, candidataId: d.huellaId, puntaje: d.puntaje, umbral: busqueda.umbral, ...(ctx.fecha ? { createdAt: ctx.fecha } : {}) },
        });
      }
      await this.custodia.agregar(tx, {
        stickerId: s.id,
        tipo: 'DIGITALIZACION_HUELLAS',
        ctx,
        archivoSha256: shaImagen,
        detalle: {
          posicion: p.posicion,
          dedo: DEDOS[p.posicion],
          origen: p.origen,
          dpi: Math.round(p.dpi),
          archivo: p.nombre,
          minucias: ex.minutiaCount,
          sha256Plantilla: sha256(plantilla),
          controlDuplicados: {
            comparadas: busqueda.candidatas,
            umbral: busqueda.umbral,
            puntajeMaximo: busqueda.mejores[0]?.puntaje ?? 0,
            posiblesDuplicados: duplicados.map((d) => ({ sticker: d.stickerCodigo, posicion: d.posicion, puntaje: d.puntaje })),
          },
        },
      });
      await this.stickers.actualizarEstado(tx, s.id);
      return h;
    });

    await this.auditoria.registrar(ctx, 'DIGITALIZAR_HUELLA', {
      recurso: s.codigo,
      detalle: { posicion: p.posicion, minucias: ex.minutiaCount, duplicados: duplicados.length },
    });
    if (duplicados.length) {
      await this.auditoria.registrar(ctx, 'ALERTA_HUELLA_DUPLICADA', {
        recurso: s.codigo,
        detalle: { posicion: p.posicion, coincideCon: duplicados.map((d) => d.stickerCodigo) },
      });
    }

    return {
      huella: {
        id: huella.id,
        posicion: huella.posicion,
        dedo: DEDOS[huella.posicion],
        cantidadMinucias: ex.minutiaCount,
        minucias: ex.minutiae,
        ancho: ex.width,
        alto: ex.height,
        dpi: huella.dpi,
        sha256Imagen: shaImagen,
      },
      control: {
        comparadas: busqueda.candidatas,
        umbral: busqueda.umbral,
        millis: busqueda.millis,
        puntajeMaximo: busqueda.mejores[0]?.puntaje ?? 0,
        duplicados,
      },
    };
  }

  async imagen(id: string) {
    const h = await this.prisma.huella.findUnique({ where: { id }, select: { imagenPng: true, sticker: { select: { codigo: true } } } });
    if (!h) throw new NotFoundException('La huella no existe.');
    return h;
  }
}
