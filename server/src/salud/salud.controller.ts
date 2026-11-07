import { Controller, Get } from '@nestjs/common';
import { AfisService } from '../afis/afis.service';
import { Publico } from '../common/sesion';
import { PrismaService } from '../prisma/prisma.service';

@Controller('salud')
export class SaludController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly afis: AfisService,
  ) {}

  // Estado de los servicios para la barra superior. No expone datos.
  @Publico()
  @Get()
  async salud() {
    let db = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    const afis = await this.afis.salud();
    return { api: true, db, afis: afis.ok, afisVersion: afis.version ?? null, umbral: afis.umbral ?? this.afis.umbral };
  }
}
