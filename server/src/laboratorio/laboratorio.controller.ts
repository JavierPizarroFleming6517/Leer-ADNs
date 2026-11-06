import { Body, Controller, HttpCode, Get, Param, ParseUUIDPipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { exigirArchivo, nombreArchivo, subida } from '../common/archivos';
import { Ctx, Roles, Sesion } from '../common/sesion';
import { MaterialAgotadoDto, PerfilDto } from './dto/lab.dto';
import { LaboratorioService } from './laboratorio.service';

// Resultado del laboratorio externo: perfil genético, archivos adicionales y aviso de material agotado.
@Controller()
export class LaboratorioController {
  constructor(private readonly lab: LaboratorioService) {}

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/perfil')
  @UseInterceptors(FileInterceptor('archivo', subida(5)))
  perfil(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: PerfilDto, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f);
    return this.lab.cargarPerfil(codigo, { nombre: nombreArchivo(a), datos: a.buffer, mime: a.mimetype }, dto, ctx);
  }

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/laboratorio/adjuntos')
  @UseInterceptors(FileInterceptor('archivo', subida(50)))
  adjunto(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f);
    return this.lab.adjunto(codigo, { nombre: nombreArchivo(a), datos: a.buffer, mime: a.mimetype }, ctx);
  }

  @Roles('ADMIN', 'LABORATORIO')
  @Post('stickers/:codigo/laboratorio/material-agotado')
  @HttpCode(200)
  materialAgotado(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: MaterialAgotadoDto) {
    return this.lab.materialAgotado(codigo, dto.observaciones, ctx);
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
