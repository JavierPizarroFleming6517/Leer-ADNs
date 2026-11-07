import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Ctx } from '../common/sesion';
import { PrismaService } from '../prisma/prisma.service';

type Opciones = { recurso?: string; detalle?: Record<string, unknown>; exito?: boolean; ip?: string | null };

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  // Registra quién hizo o consultó qué. Nunca se guardan datos personales en el detalle.
  async registrar(ctx: Pick<Ctx, 'usuario' | 'ip' | 'fecha'> | null, accion: string, o: Opciones = {}) {
    await this.prisma.auditoria.create({
      data: {
        usuarioId: ctx?.usuario.id ?? null,
        usuarioNombre: ctx?.usuario.nombre ?? null,
        rol: ctx?.usuario.rol ?? null,
        accion,
        recurso: o.recurso ?? null,
        detalle: (o.detalle ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: o.ip ?? ctx?.ip ?? null,
        exito: o.exito ?? true,
        ...(ctx?.fecha ? { fecha: ctx.fecha } : {}),
      },
    });
  }

  async listar(f: { q?: string; accion?: string; limite?: number }) {
    const where: Prisma.AuditoriaWhereInput = {};
    if (f.accion) where.accion = f.accion;
    if (f.q) {
      where.OR = [
        { accion: { contains: f.q, mode: 'insensitive' } },
        { recurso: { contains: f.q, mode: 'insensitive' } },
        { usuarioNombre: { contains: f.q, mode: 'insensitive' } },
        { ip: { contains: f.q } },
      ];
    }
    const [items, acciones] = await Promise.all([
      this.prisma.auditoria.findMany({ where, orderBy: { fecha: 'desc' }, take: Math.min(f.limite ?? 100, 500) }),
      this.prisma.auditoria.groupBy({ by: ['accion'], _count: true, orderBy: { accion: 'asc' } }),
    ]);
    return { items, acciones: acciones.map((a) => ({ accion: a.accion, total: a._count })) };
  }
}
