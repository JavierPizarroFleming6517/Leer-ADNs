import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AfisModule } from './afis/afis.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AuthModule } from './auth/auth.module';
import { CriptoModule } from './cripto/cripto.module';
import { CustodiaModule } from './custodia/custodia.module';
import { HuellasController } from './huellas/huellas.controller';
import { HuellasService } from './huellas/huellas.service';
import { InicioController } from './inicio/inicio.controller';
import { LaboratorioController } from './laboratorio/laboratorio.controller';
import { LaboratorioService } from './laboratorio/laboratorio.service';
import { PersonasController } from './personas/personas.controller';
import { PersonasService } from './personas/personas.service';
import { PrismaModule } from './prisma/prisma.module';
import { SaludController } from './salud/salud.controller';
import { FichaService } from './stickers/ficha.service';
import { StickersController } from './stickers/stickers.controller';
import { StickersService } from './stickers/stickers.service';
import { VerificacionController, VerificacionService } from './verificacion/verificacion.controller';
import { VinculosController } from './vinculos/vinculos.controller';
import { VinculosService } from './vinculos/vinculos.service';

@Module({
  imports: [PrismaModule, CriptoModule, AuditoriaModule, CustodiaModule, AfisModule, AuthModule],
  controllers: [
    SaludController,
    StickersController,
    PersonasController,
    HuellasController,
    LaboratorioController,
    VinculosController,
    VerificacionController,
    InicioController,
    AdminController,
  ],
  providers: [
    StickersService,
    FichaService,
    PersonasService,
    HuellasService,
    LaboratorioService,
    VinculosService,
    VerificacionService,
  ],
})
export class AppModule {}
