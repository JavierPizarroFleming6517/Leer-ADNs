import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { esPdf, exigirArchivo, nombreArchivo, subida } from '../common/archivos';
import { Ctx, Roles, Sesion } from '../common/sesion';
import { AsociarPersonaDto, BuscarDocumentoDto, ConsentimientoDto, EnvioDto, TomaDto } from './dto/persona.dto';
import { PersonasService } from './personas.service';

@Controller()
export class PersonasController {
  constructor(private readonly personas: PersonasService) {}

  @Roles('ADMIN', 'OPERADOR_TOMA', 'VERIFICADOR')
  @Get('personas')
  listar(@Sesion() ctx: Ctx, @Query('q') q?: string) {
    return this.personas.listar(q, ctx);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA')
  @Post('personas/buscar-documento')
  @HttpCode(200)
  buscar(@Sesion() ctx: Ctx, @Body() dto: BuscarDocumentoDto) {
    return this.personas.buscarPorDocumento(dto.tipoDocumento, dto.numeroDocumento, dto.pais, ctx);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA')
  @Post('stickers/:codigo/persona')
  asociar(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: AsociarPersonaDto) {
    return this.personas.asociar(codigo, dto, ctx);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA')
  @Post('stickers/:codigo/consentimiento')
  @UseInterceptors(FileInterceptor('archivo', subida(10)))
  consentimiento(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: ConsentimientoDto, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f);
    if (!esPdf(a.buffer)) throw new BadRequestException('El consentimiento debe ser un archivo PDF.');
    return this.personas.consentimiento(codigo, dto, { nombre: nombreArchivo(a), datos: a.buffer }, ctx);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA')
  @Post('stickers/:codigo/toma')
  toma(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: TomaDto) {
    return this.personas.toma(codigo, dto, ctx);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA')
  @Post('stickers/:codigo/envio')
  envio(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: EnvioDto) {
    return this.personas.envio(codigo, dto, ctx);
  }

  @Roles('ADMIN', 'OPERADOR_TOMA')
  @Get('consentimientos/:id/pdf')
  async pdf(@Sesion() ctx: Ctx, @Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const c = await this.personas.archivoConsentimiento(id, ctx);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(c.archivoNombre)}"`);
    res.send(Buffer.from(c.archivo));
  }
}
