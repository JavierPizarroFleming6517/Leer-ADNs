import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { TipoEvento } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { CustodiaService, NOMBRE_EVENTO } from './custodia.service';

@Controller()
export class CustodiaController {
  constructor(
    private readonly custodia: CustodiaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  @Roles('ADMIN', 'LABORATORIO', 'VERIFICADOR')
  @Get('custodia')
  async buscar(@Sesion() ctx: Ctx, @Query('q') q?: string, @Query('tipo') tipo?: string) {
    const t = tipo && tipo in NOMBRE_EVENTO ? (tipo as TipoEvento) : undefined;
    await this.auditoria.registrar(ctx, 'CONSULTA_CUSTODIA', { recurso: 'custodia', detalle: { q: q?.slice(0, 60) ?? null, tipo: t ?? null } });
    return this.custodia.buscar({ q: q?.slice(0, 100), tipo: t });
  }

  @Roles(...TODOS)
  @Get('stickers/:codigo/custodia')
  async deSticker(@Param('codigo') codigo: string) {
    const s = await this.custodia.stickerPorCodigo(codigo);
    return this.custodia.eventosDeSticker(s.id);
  }

  @Roles(...TODOS)
  @Post('stickers/:codigo/custodia/verificar')
  @HttpCode(200)
  async verificar(@Sesion() ctx: Ctx, @Param('codigo') codigo: string) {
    const s = await this.custodia.stickerPorCodigo(codigo);
    const r = await this.custodia.verificar(s.id);
    await this.auditoria.registrar(ctx, 'VERIFICAR_CADENA', { recurso: s.codigo, detalle: { integra: r.integra, eventos: r.eventos }, exito: r.integra });
    return r;
  }
}
