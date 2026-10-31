import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }

    const request = context.switchToHttp().getRequest<Request & { user?: { role: Role } }>();
    if (!request.user || !required.includes(request.user.role)) {
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }

    return true;
  }
}
