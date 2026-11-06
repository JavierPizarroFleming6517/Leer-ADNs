import { Controller, Get } from '@nestjs/common';
import { DEDOS } from '../common/dominio';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { NOMBRE_EVENTO } from '../custodia/custodia.service';
import { LaboratorioService } from '../laboratorio/laboratorio.service';
import { PrismaService } from '../prisma/prisma.service';
import { contarEstados } from '../stickers/stickers.service';
import { VinculosService } from '../vinculos/vinculos.service';

@Controller('inicio')
export class InicioController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lab: LaboratorioService,
    private readonly vinculos: VinculosService,
  ) {}

  @Roles(...TODOS)
  @Get()
  async inicio(@Sesion() _ctx: Ctx) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const [estados, bandeja, duplicados, qrFalsos, qrFalsosTotal, eventos, personas, huellas, busquedasMes, sellos, revision] = await Promise.all([
      this.prisma.sticker.findMany({ select: { estado: true } }),
      this.lab.bandeja(),
      this.prisma.coincidenciaHuella.findMany({
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
      this.prisma.huella.count(),
      this.prisma.auditoria.count({ where: { accion: { in: ['VERIFICACION_HUELLA', 'VERIFICACION_PERFIL'] }, fecha: { gte: inicioMes } } }),
      this.prisma.muestraBiologica.findMany({ where: { estadoSello: { not: 'INTACTO' } }, select: { codigo: true, estadoSello: true, sticker: { select: { codigo: true } } } }),
      this.vinculos.revisarTodos(),
    ]);
    const enLab = bandeja.filter((m) => m.etapa !== 'PERFIL_CARGADO' && m.materialRestante);
    const porEtapa = new Map<string, { etapa: string; nombre: string; total: number; diasMax: number; diasProm: number }>();
    for (const m of enLab) {
      const e = porEtapa.get(m.etapa) ?? { etapa: m.etapa, nombre: m.etapaNombre, total: 0, diasMax: 0, diasProm: 0 };
      e.diasProm = (e.diasProm * e.total + m.diasEnEtapa) / (e.total + 1);
      e.total++;
      e.diasMax = Math.max(e.diasMax, m.diasEnEtapa);
      porEtapa.set(m.etapa, e);
    }
    return {
      stickersPorEstado: contarEstados(estados.map((s) => s.estado)),
      totalStickers: estados.length,
      laboratorio: { porEtapa: [...porEtapa.values()], muestras: enLab },
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
        sellos: sellos.map((s) => ({ sticker: s.sticker.codigo, muestra: s.codigo, estadoSello: s.estadoSello })),
      },
      eventos: eventos.map((e) => ({ id: e.id, sticker: e.sticker.codigo, tipo: e.tipo, nombre: NOMBRE_EVENTO[e.tipo], fecha: e.fecha, responsable: e.responsableNombre, hash: e.hashEvento })),
      totales: { personas, huellas, vinculos: revision.total, busquedasMes },
    };
  }
}
