import { Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { VinculosService } from './vinculos.service';

@Controller('stickers/:codigo/vinculo')
export class VinculosController {
  constructor(private readonly vinculos: VinculosService) {}

  @Roles('ADMIN', 'LABORATORIO')
  @Post()
  firmar(@Sesion() ctx: Ctx, @Param('codigo') codigo: string) {
    return this.vinculos.firmar(codigo, ctx);
  }

  @Roles(...TODOS)
  @Post('verificar')
  @HttpCode(200)
  verificar(@Sesion() ctx: Ctx, @Param('codigo') codigo: string) {
    return this.vinculos.verificar(codigo, ctx);
  }
}
