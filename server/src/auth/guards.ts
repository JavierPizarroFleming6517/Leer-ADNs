import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Rol } from '@prisma/client';
import type { Request } from 'express';
import { PUBLICO_KEY, ROLES_KEY, UsuarioSesion } from '../common/sesion';
import { PrismaService } from '../prisma/prisma.service';

// Guard global: exige JWT válido y un usuario activo; luego revisa el rol.
// Denegado por defecto: un endpoint sin @Roles ni @Publico no es accesible.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const objetivo = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO_KEY, objetivo)) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: UsuarioSesion }>();
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) throw new UnauthorizedException('Sesión inválida o expirada.');
    let payload: { sub?: string };
    try {
      payload = this.jwt.verify(h.slice(7).trim());
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
    const u = payload.sub
      ? await this.prisma.usuario.findUnique({ where: { id: payload.sub } })
      : null;
    if (!u || !u.activo) throw new UnauthorizedException('Sesión inválida o expirada.');
    req.user = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };

    const roles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, objetivo);
    if (!roles?.length || !roles.includes(u.rol)) {
      throw new ForbiddenException('Tu rol no tiene permiso para esta operación.');
    }
    return true;
  }
}
