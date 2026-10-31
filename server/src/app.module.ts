import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PersonasModule } from './personas/personas.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, PersonasModule],
})
export class AppModule {}
