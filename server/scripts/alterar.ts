// npm run demo:alterar · Modifica DIRECTAMENTE en PostgreSQL (sin pasar por la API) un alelo del perfil
// genético de una persona con vínculo firmado. Sirve para mostrar que "Verificar integridad" lo detecta.
// "npm run demo:reset" deja todo como estaba.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const LOCUS = 'D8S1179';

async function main() {
  const prisma = new PrismaClient();
  try {
    const archivo = join(__dirname, '..', '..', 'datasets', 'asignacion.json');
    let codigo: string | undefined;
    if (existsSync(archivo)) codigo = JSON.parse(readFileSync(archivo, 'utf8'))?.stickers?.alterable?.codigo;
    const filas = await prisma.$queryRaw<{ codigo: string; perfil_id: string; marcadores: Record<string, string[]>; nombres: string; apellidos: string; muestra: string }[]>`
      SELECT s.codigo, p.id AS perfil_id, p.marcadores, pe.nombres, pe.apellidos, p."codigoMuestra" AS muestra
      FROM "Sticker" s
      JOIN "PerfilGenetico" p ON p."stickerId" = s.id
      JOIN "Persona" pe ON pe.id = s."personaId"
      JOIN "VinculoDactilogenetico" v ON v."stickerId" = s.id AND v.estado = 'VIGENTE'
      ORDER BY (s.codigo = ${codigo ?? ''}) DESC, s."createdAt" ASC
      LIMIT 1`;
    const f = filas[0];
    if (!f) throw new Error('No hay ninguna persona con vínculo firmado. Ejecuta npm run demo:reset.');
    const antes = f.marcadores[LOCUS] ?? [];
    const ultimo = antes.length ? antes[antes.length - 1] : '12';
    const nuevo = String(Math.round((parseFloat(ultimo) + 1) * 10) / 10);
    const despues = [...new Set([...(antes.length > 1 ? antes.slice(0, -1) : antes), nuevo])].sort((a, b) => parseFloat(a) - parseFloat(b));
    // UPDATE directo sobre la tabla, como lo haría alguien con acceso a la base.
    await prisma.$executeRaw`UPDATE "PerfilGenetico" SET marcadores = jsonb_set(marcadores, ${`{${LOCUS}}`}::text[], ${JSON.stringify(despues)}::jsonb) WHERE id = ${f.perfil_id}::uuid`;
    console.log(`
\x1b[33m⚠ Perfil alterado directamente en la base de datos (sin pasar por la API).\x1b[0m

  Persona:   ${f.nombres} ${f.apellidos}
  Sticker:   ${f.codigo}
  Muestra:   ${f.muestra}
  Locus:     ${LOCUS}
  Antes:     ${antes.join(', ')}
  Ahora:     ${despues.join(', ')}

Abre el sticker ${f.codigo} → pestaña «Vínculo dactilogenético» → «Verificar integridad».
Para restaurar todo: npm run demo:reset
`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
