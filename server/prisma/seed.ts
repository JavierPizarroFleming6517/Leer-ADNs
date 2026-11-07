// Siembra de TrazaGen. Usa los mismos servicios que la API: custodia, firmas, cifrado y SourceAFIS son reales.
import 'reflect-metadata';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { sembrarBase } from './siembra/base';

async function main() {
  const prisma = new PrismaClient();
  try {
    const base = await sembrarBase(prisma);
    console.log(`✓ Usuarios (${Object.keys(base.usuarios).length}), kits y plantillas.`);
    if (process.argv.includes('--solo-base')) return;
    const { sembrarDemo } = await import('./siembra/demo');
    await sembrarDemo(base);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗ Error en la siembra:', e instanceof Error ? e.message : e);
  process.exit(1);
});
