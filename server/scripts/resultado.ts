// npm run demo:resultado -- TG-XXXX-XXXX
// Genera el archivo que entregaría el laboratorio externo para un sticker: un CODIS CMF XML con
// SPECIMENID = código del sticker y un perfil GlobalFiler FICTICIO (determinista a partir del código).
// Es una herramienta de demostración: en producción este archivo lo produce el laboratorio.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { construirCmf, perfilGlobalFiler } from '../prisma/siembra/cmf';

async function main() {
  const entrada = (process.argv[2] ?? '').trim().toUpperCase();
  if (!/^TG-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(entrada)) {
    console.error('Uso: npm run demo:resultado -- TG-XXXX-XXXX   (el código del sticker que está esperando su resultado)');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const s = await prisma.sticker.findUnique({
      where: { codigo: entrada },
      include: { persona: { select: { sexoDeclarado: true } }, perfil: { select: { id: true } } },
    });
    if (!s) throw new Error(`No existe el sticker ${entrada} en la base de server/.env.`);
    if (s.perfil) throw new Error(`El sticker ${entrada} ya tiene su perfil genético cargado.`);
    const sexo = s.persona?.sexoDeclarado === 'Masculino' ? 'M' : 'F';
    const semilla = createHash('sha256').update(entrada).digest().readUInt32BE(0);
    const xml = construirCmf([{ id: entrada, marcadores: perfilGlobalFiler(semilla, sexo) }]);
    const dir = join(__dirname, '..', '..', 'examples', 'demo', 'resultados');
    mkdirSync(dir, { recursive: true });
    const archivo = join(dir, `${entrada}.xml`);
    writeFileSync(archivo, xml);
    console.log(`
✓ Resultado del laboratorio generado (perfil GlobalFiler ficticio, SPECIMENID ${entrada}):

  ${relative(join(__dirname, '..', '..'), archivo)}

Súbelo en el sticker ${entrada} → «Laboratorio y perfil», con el kit GlobalFiler.
`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
