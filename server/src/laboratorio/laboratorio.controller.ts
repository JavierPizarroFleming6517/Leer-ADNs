import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TipoEvento } from '@prisma/client';
import type { Response } from 'express';
import { exigirArchivo, nombreArchivo, subida } from '../common/archivos';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { AdjuntoDto, EtapaDto, FinalizarDto, PerfilDto, RecepcionDto } from './dto/lab.dto';
import { LaboratorioService } from './laboratorio.service';

const archivoOpcional = (f?: Express.Multer.File) =>
  f?.buffer?.length ? { nombre: nombreArchivo(f), datos: f.buffer, mime: f.mimetype } : null;

@Controller()
export class LaboratorioController {
  constructor(private readonly lab: LaboratorioService) {}

  @Roles('ADMIN', 'LABORATORIO')
  @Get('laboratorio/bandeja')
  bandeja() {
    return this.lab.bandeja();
  }

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/laboratorio/recepcion')
  @UseInterceptors(FileInterceptor('archivo', subida(50)))
  recepcion(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: RecepcionDto, @UploadedFile() f?: Express.Multer.File) {
    return this.lab.recepcion(codigo, dto, archivoOpcional(f), ctx);
  }

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/laboratorio/etapa')
  @UseInterceptors(FileInterceptor('archivo', subida(50)))
  etapa(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: EtapaDto, @UploadedFile() f?: Express.Multer.File) {
    return this.lab.etapa(codigo, dto, archivoOpcional(f), ctx);
  }

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/laboratorio/adjuntos')
  @UseInterceptors(FileInterceptor('archivo', subida(50)))
  adjunto(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: AdjuntoDto, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f);
    return this.lab.adjunto(codigo, (dto.etapa as TipoEvento) ?? null, { nombre: nombreArchivo(a), datos: a.buffer, mime: a.mimetype }, ctx);
  }

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/laboratorio/finalizar')
  finalizar(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: FinalizarDto) {
    return this.lab.finalizar(codigo, dto.observaciones, ctx);
  }

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/perfil')
  @UseInterceptors(FileInterceptor('archivo', subida(5)))
  perfil(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: PerfilDto, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f);
    return this.lab.cargarPerfil(codigo, { nombre: nombreArchivo(a), datos: a.buffer, mime: a.mimetype }, dto.kit, ctx);
  }

  // Descarga del archivo tal como se recibió (sin modificar).
  @Roles('ADMIN', 'LABORATORIO')
  @Get('archivos/:id')
  async archivo(@Sesion() ctx: Ctx, @Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const a = await this.lab.archivo(id, ctx);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(a.nombre)}"`);
    res.setHeader('X-Content-SHA256', a.sha256);
    res.send(Buffer.from(a.datos));
  }
}
