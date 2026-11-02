import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MuestrasController } from './muestras.controller';
import { MuestrasService } from './muestras.service';

@Module({
  imports: [AuthModule],
  controllers: [MuestrasController],
  providers: [MuestrasService],
  exports: [MuestrasService],
})
export class MuestrasModule {}
