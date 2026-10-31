import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'error desconocido';
      throw new Error(`No se pudo conectar a PostgreSQL. Revisa DATABASE_URL. ${detail}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
