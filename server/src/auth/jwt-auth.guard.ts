import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Role } from './roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: { role: Role } }>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    try {
      const payload = this.jwtService.verify<{ role?: Role }>(header.slice('Bearer '.length).trim());
      if (payload.role !== 'ADMIN' && payload.role !== 'READER') {
        throw new UnauthorizedException('Sesión inválida o expirada.');
      }
      request.user = { role: payload.role };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
  }
}
