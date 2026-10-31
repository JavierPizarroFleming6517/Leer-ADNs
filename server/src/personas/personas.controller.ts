import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ImportarPersonaDto } from './dto/importar-persona.dto';
import { PersonasService } from './personas.service';

@Controller('personas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Post('importar')
  importar(@Body() dto: ImportarPersonaDto) {
    return this.personasService.importar(dto);
  }

  @Get()
  listar() {
    return this.personasService.listar();
  }

  @Post(':id/qr')
  generarQr(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () => new BadRequestException('El identificador de la persona no es válido.'),
      }),
    )
    id: string,
  ) {
    return this.personasService.generarQr(id);
  }
}
