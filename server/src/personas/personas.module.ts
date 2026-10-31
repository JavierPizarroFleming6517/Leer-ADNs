import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';
import { QrController } from './qr.controller';

@Module({
  imports: [AuthModule],
  controllers: [PersonasController, QrController],
  providers: [PersonasService],
})
export class PersonasModule {}
