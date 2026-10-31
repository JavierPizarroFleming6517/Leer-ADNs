import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { Role } from './roles.decorator';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(password: string): { accessToken: string; role: Role } {
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD?.trim() ?? '';
    const readerPassword = process.env.DEMO_READER_PASSWORD?.trim() ?? '';

    let role: Role | null = null;
    if (this.matches(password, adminPassword)) {
      role = 'ADMIN';
    } else if (this.matches(password, readerPassword)) {
      role = 'READER';
    }

    if (!role) {
      throw new UnauthorizedException('La contraseña no es válida.');
    }

    return {
      accessToken: this.jwtService.sign({ role }),
      role,
    };
  }

  private matches(input: string, secret: string): boolean {
    if (!secret) {
      return false;
    }

    const left = createHash('sha256').update(input, 'utf8').digest();
    const right = createHash('sha256').update(secret, 'utf8').digest();
    return timingSafeEqual(left, right);
  }
}
