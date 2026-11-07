import { Controller, Get } from '@nestjs/common';
import { DEDOS } from '../common/dominio';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { NOMBRE_EVENTO } from '../custodia/custodia.service';
import { PrismaService } from '../prisma/prisma.service';
import { contarEstados } from '../stickers/stickers.service';
import { VinculosService } from '../vinculos/vinculos.service';

@Controller('inicio')
export class InicioController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vinculos: VinculosService,
  ) {}

  @Roles(...TODOS)
  @Get()
  async inicio(@Sesion() _ctx: Ctx) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const [estados, enviados, duplicados, qrFalsos, qrFalsosTotal, eventos, personas, huellas, busquedasMes, anulados, revision] = await Promise.all([
      this.prisma.sticker.findMany({ where: { anuladoEn: null }, select: { estado: true } }),
      // Enviados al laboratorio externo y todavía sin resultado.
      this.prisma.sticker.findMany({
        where: { anuladoEn: null, perfil: null, eventos: { some: { tipo: 'ENVIO' } } },
        select: { codigo: true, eventos: { where: { tipo: 'ENVIO' }, orderBy: { secuencia: 'desc' }, take: 1, select: { fecha: true, detalle: true } } },
      }),
      this.prisma.coincidenciaHuella.findMany({
        where: { huella: { sticker: { anuladoEn: null } }, candidata: { sticker: { anuladoEn: null } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          puntaje: true,
          createdAt: true,
          huella: { select: { posicion: true, sticker: { select: { codigo: true } } } },
          candidata: { select: { posicion: true, sticker: { select: { codigo: true } } } },
        },
      }),
      this.prisma.auditoria.findMany({ where: { accion: 'QR_FALSO' }, orderBy: { fecha: 'desc' }, take: 5, select: { fecha: true, usuarioNombre: true, detalle: true, ip: true } }),
      this.prisma.auditoria.count({ where: { accion: 'QR_FALSO' } }),
      this.prisma.eventoCustodia.findMany({ orderBy: { fecha: 'desc' }, take: 8, include: { sticker: { select: { codigo: true } } } }),
      this.prisma.persona.count(),
      this.prisma.huella.count({ where: { sticker: { anuladoEn: null } } }),
      this.prisma.auditoria.count({ where: { accion: { in: ['VERIFICACION_HUELLA', 'VERIFICACION_PERFIL'] }, fecha: { gte: inicioMes } } }),
      this.prisma.sticker.count({ where: { anuladoEn: { not: null } } }),
      this.vinculos.revisarTodos(),
    ]);
    const ahora = Date.now();
    return {
      stickersPorEstado: contarEstados(estados.map((s) => s.estado)),
      totalStickers: estados.length,
      anulados,
      laboratorio: enviados
        .map((s) => ({
          sticker: s.codigo,
          destino: String((s.eventos[0]?.detalle as { destino?: string } | undefined)?.destino ?? '—'),
          enviado: s.eventos[0]?.fecha,
          dias: s.eventos[0] ? Math.floor((ahora - s.eventos[0].fecha.getTime()) / 86_400_000) : 0,
        }))
        .sort((a, b) => b.dias - a.dias),
      alertas: {
        duplicados: duplicados.map((d) => ({
          sticker: d.huella.sticker.codigo,
          dedo: DEDOS[d.huella.posicion],
          coincideCon: d.candidata.sticker.codigo,
          dedoCoincidente: DEDOS[d.candidata.posicion],
          puntaje: d.puntaje,
          fecha: d.createdAt,
        })),
        vinculosInvalidos: revision.invalidos,
        qrFalsos: { total: qrFalsosTotal, ultimos: qrFalsos },
      },
      eventos: eventos.map((e) => ({ id: e.id, sticker: e.sticker.codigo, tipo: e.tipo, nombre: NOMBRE_EVENTO[e.tipo], fecha: e.fecha, responsable: e.responsableNombre, hash: e.hashEvento })),
      totales: { personas, huellas, vinculos: revision.total, busquedasMes },
    };
  }
}
