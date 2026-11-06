import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Rol } from '@prisma/client';
import type { Request } from 'express';

export type UsuarioSesion = { id: string; nombre: string; email: string; rol: Rol };

// Contexto de cada operación: quién, desde dónde y (solo en la siembra) cuándo.
export type Ctx = { usuario: UsuarioSesion; ip?: string | null; fecha?: Date };

export const ROLES_KEY = 'roles';
export const PUBLICO_KEY = 'publico';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
export const Publico = () => SetMetadata(PUBLICO_KEY, true);

export const TODOS: Rol[] = ['ADMIN', 'OPERADOR_TOMA', 'LABORATORIO', 'VERIFICADOR'];

export function ipDe(req: Request): string | null {
  const ip = req.ip || req.socket?.remoteAddress || null;
  return ip ? ip.replace(/^::ffff:/, '') : null;
}

export const Sesion = createParamDecorator((_: unknown, ctx: ExecutionContext): Ctx => {
  const req = ctx.switchToHttp().getRequest<Request & { user?: UsuarioSesion }>();
  return { usuario: req.user!, ip: ipDe(req) };
});
