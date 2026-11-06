import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoEvento } from '@prisma/client';
import { Ctx } from '../common/sesion';
import { PrismaService } from '../prisma/prisma.service';
import { GENESIS, hashEvento, normalizarDetalle, verificarCadena } from './cadena';

export const NOMBRE_EVENTO: Record<TipoEvento, string> = {
  FABRICACION: 'Fabricación',
  TOMA: 'Toma de muestra',
  DIGITALIZACION_HUELLAS: 'Digitalización de huella',
  ENVIO: 'Envío al laboratorio',
  RECEPCION_LAB: 'Recepción en laboratorio',
  EXTRACCION: 'Extracción de ADN',
  CUANTIFICACION: 'Cuantificación',
  AMPLIFICACION: 'Amplificación (PCR)',
  ELECTROFORESIS: 'Electroforesis capilar',
  INTERPRETACION: 'Interpretación',
  PERFIL_CARGADO: 'Perfil genético cargado',
  VINCULO_FIRMADO: 'Vínculo firmado',
  VERIFICACION: 'Verificación',
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class CustodiaService {
  constructor(private readonly prisma: PrismaService) {}

  // Agrega un evento al final de la cadena del sticker. Debe llamarse dentro de una transacción.
  async agregar(
    tx: Tx,
    p: { stickerId: string; tipo: TipoEvento; ctx: Ctx; detalle?: Record<string, unknown>; archivoSha256?: string | null },
  ) {
    // Bloqueo por sticker: dos eventos simultáneos no pueden apuntar al mismo anterior.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${p.stickerId}))`;
    const ultimo = await tx.eventoCustodia.findFirst({
      where: { stickerId: p.stickerId },
      orderBy: { secuencia: 'desc' },
      select: { secuencia: true, hashEvento: true, fecha: true },
    });
    let fecha = p.ctx.fecha ?? new Date();
    if (ultimo && fecha <= ultimo.fecha) fecha = new Date(ultimo.fecha.getTime() + 1000);
    const contenido = {
      stickerId: p.stickerId,
      secuencia: (ultimo?.secuencia ?? 0) + 1,
      tipo: p.tipo,
      fecha: fecha.toISOString(),
      responsableId: p.ctx.usuario.id,
      responsableNombre: p.ctx.usuario.nombre,
      detalle: normalizarDetalle(JSON.parse(JSON.stringify(p.detalle ?? {}))),
      archivoSha256: p.archivoSha256 ?? null,
      hashAnterior: ultimo?.hashEvento ?? GENESIS,
    };
    return tx.eventoCustodia.create({
      data: { ...contenido, fecha, detalle: contenido.detalle as Prisma.InputJsonValue, hashEvento: hashEvento(contenido) },
    });
  }

  async agregarSolo(p: Parameters<CustodiaService['agregar']>[1]) {
    return this.prisma.$transaction((tx) => this.agregar(tx, p));
  }

  async eventosDeSticker(stickerId: string) {
    return this.prisma.eventoCustodia.findMany({ where: { stickerId }, orderBy: { secuencia: 'asc' } });
  }

  async verificar(stickerId: string) {
    const eventos = await this.eventosDeSticker(stickerId);
    return verificarCadena(eventos);
  }

  async buscar(f: { q?: string; tipo?: TipoEvento; limite?: number }) {
    const where: Prisma.EventoCustodiaWhereInput = {};
    if (f.tipo) where.tipo = f.tipo;
    if (f.q) {
      const q = f.q.trim();
      where.OR = [
        { sticker: { codigo: { contains: q, mode: 'insensitive' } } },
        { responsableNombre: { contains: q, mode: 'insensitive' } },
        { hashEvento: { startsWith: q.toLowerCase() } },
        { archivoSha256: { startsWith: q.toLowerCase() } },
      ];
    }
    const eventos = await this.prisma.eventoCustodia.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: Math.min(f.limite ?? 150, 500),
      include: { sticker: { select: { codigo: true, estado: true } } },
    });
    return eventos;
  }

  async stickerPorCodigo(codigo: string) {
    const s = await this.prisma.sticker.findUnique({ where: { codigo }, select: { id: true, codigo: true } });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    return s;
  }
}
