import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Ctx } from '../common/sesion';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe.
const HASH_FALSO = bcrypt.hashSync('trazagen-usuario-inexistente', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async login(email: string, password: string, ip: string | null) {
    const u = await this.prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
    const ok = await bcrypt.compare(password, u?.passwordHash ?? HASH_FALSO);
    if (!u || !ok || !u.activo) {
      await this.auditoria.registrar(null, 'LOGIN_FALLIDO', { recurso: 'auth', detalle: { email: email.slice(0, 200) }, exito: false, ip });
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    const usuario = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
    await this.auditoria.registrar({ usuario, ip }, 'LOGIN', { recurso: 'auth' });
    return {
      accessToken: this.jwt.sign({ sub: u.id, rol: u.rol }),
      usuario: { ...usuario, institucion: u.institucion },
    };
  }

  async usuariosDemo() {
    const us = await this.prisma.usuario.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'asc' },
      select: { nombre: true, email: true, rol: true, institucion: true },
      take: 8,
    });
    return us;
  }

  async yo(ctx: Ctx) {
    const u = await this.prisma.usuario.findUniqueOrThrow({ where: { id: ctx.usuario.id } });
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, institucion: u.institucion };
  }
}
