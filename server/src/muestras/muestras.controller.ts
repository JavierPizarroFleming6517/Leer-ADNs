import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MuestrasService } from './muestras.service';

const MAX_BYTES = 5 * 1024 * 1024;

@Controller('muestras')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MuestrasController {
  constructor(private readonly muestras: MuestrasService) {}

  // Recibe el archivo del laboratorio, lo convierte a JSON y lo compara con el registro. No guarda nada.
  @Post('analizar')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }))
  analizar(@UploadedFile() archivo?: Express.Multer.File) {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('Adjunta un archivo en el campo "archivo".');
    }
    const nombre = Buffer.from(archivo.originalname, 'latin1').toString('utf8').slice(0, 200);
    return this.muestras.analizar(nombre, archivo.buffer);
  }
}
