import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Ctx, Publico, Roles, Sesion, TODOS, ipDe } from '../common/sesion';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, ipDe(req));
  }

  // Lista de usuarios de demostración para el selector "Entrar como". Nunca incluye contraseñas.
  @Publico()
  @Get('usuarios-demo')
  usuariosDemo() {
    return this.auth.usuariosDemo();
  }

  @Roles(...TODOS)
  @Get('yo')
  yo(@Sesion() ctx: Ctx) {
    return this.auth.yo(ctx);
  }
}
