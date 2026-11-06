import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { CrearLoteDto, ResolverQrDto } from './dto/lote.dto';
import { FichaService } from './ficha.service';
import { StickersService } from './stickers.service';

@Controller()
export class StickersController {
  constructor(
    private readonly stickers: StickersService,
    private readonly fichas: FichaService,
  ) {}

  @Roles('ADMIN', 'OPERADOR_TOMA', 'LABORATORIO')
  @Get('lotes')
  lotes() {
    return this.stickers.lotes();
  }

  @Roles('ADMIN')
  @Post('lotes')
  crearLote(@Sesion() ctx: Ctx, @Body() dto: CrearLoteDto) {
    return this.stickers.crearLote(dto, ctx);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA', 'LABORATORIO')
  @Get('lotes/:id')
  lote(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stickers.lote(id);
  }

  // CSV para la fábrica: código y URL firmada de cada sticker.
  @Roles('ADMIN')
  @Get('lotes/:id/csv')
  async csv(@Sesion() ctx: Ctx, @Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const { nombre, contenido } = await this.stickers.csvLote(id, ctx);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(contenido);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA', 'LABORATORIO')
  @Get('stickers')
  listar(@Query('estado') estado?: string, @Query('lote') lote?: string, @Query('pais') pais?: string, @Query('q') q?: string) {
    return this.stickers.listar({ estado, lote: lote?.slice(0, 30), pais: pais?.slice(0, 60), q: q?.slice(0, 30) });
  }

  @Roles(...TODOS)
  @Get('stickers/:codigo')
  ficha(@Sesion() ctx: Ctx, @Param('codigo') codigo: string) {
    return this.fichas.ficha(codigo.slice(0, 20), ctx);
  }

  @Roles(...TODOS)
  @Post('qr/resolver')
  @HttpCode(200)
  resolver(@Sesion() ctx: Ctx, @Body() dto: ResolverQrDto) {
    return this.stickers.resolverQr(dto.texto, ctx);
  }
}
