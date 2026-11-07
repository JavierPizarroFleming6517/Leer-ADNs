import { BadRequestException, Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';
import { exigirArchivo, nombreArchivo, subida } from '../common/archivos';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { HuellasService } from './huellas.service';

class SubirHuellaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  posicion!: number;

  @IsIn(['ESCANER', 'FOTO'], { message: 'El origen debe ser escáner o foto.' })
  origen!: 'ESCANER' | 'FOTO';

  @Type(() => Number)
  @IsNumber()
  @Min(250, { message: 'El DPI mínimo es 250.' })
  @Max(1200, { message: 'El DPI máximo es 1200.' })
  dpi!: number;
}

@Controller()
export class HuellasController {
  constructor(private readonly huellas: HuellasService) {}

  @Roles('ADMIN', 'OPERADOR_TOMA')
  @Post('stickers/:codigo/huellas')
  @UseInterceptors(FileInterceptor('imagen', subida(15)))
  subir(@Sesion() ctx: Ctx, @Param('codigo') codigo: string, @Body() dto: SubirHuellaDto, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f, 'imagen');
    if (!a) throw new BadRequestException();
    return this.huellas.subir(codigo, { ...dto, nombre: nombreArchivo(a), datos: a.buffer }, ctx);
  }

  @Roles(...TODOS)
  @Get('huellas/:id/imagen')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'private, max-age=300')
  async imagen(@Param('id', new ParseUUIDPipe()) id: string) {
    const h = await this.huellas.imagen(id);
    return new StreamableFile(Buffer.from(h.imagenPng));
  }
}
