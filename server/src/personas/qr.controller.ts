import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ResolverQrDto } from './dto/resolver-qr.dto';
import { PersonasService } from './personas.service';

@Controller('qr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('READER')
export class QrController {
  constructor(private readonly personasService: PersonasService) {}

  @Post('resolver')
  resolver(@Body() dto: ResolverQrDto) {
    return this.personasService.resolver(dto.token);
  }
}
