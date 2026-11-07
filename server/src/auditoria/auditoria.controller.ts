import { Controller, Get, Query } from '@nestjs/common';
import { Ctx, Roles, Sesion } from '../common/sesion';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  @Roles('ADMIN')
  @Get()
  async listar(@Sesion() ctx: Ctx, @Query('q') q?: string, @Query('accion') accion?: string) {
    await this.auditoria.registrar(ctx, 'CONSULTA_AUDITORIA', { recurso: 'auditoria' });
    return this.auditoria.listar({ q: q?.slice(0, 100), accion: accion?.slice(0, 60) });
  }
}
