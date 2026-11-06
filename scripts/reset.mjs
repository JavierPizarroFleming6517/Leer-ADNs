// npm run demo:reset: borra el esquema de la base, vuelve a migrar y a sembrar.
// No usa "prisma migrate reset": el trigger de custodia impide borrar eventos, así que se recrea el esquema.
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SERVER, conAfis, correr, leerEnv, npm, npx, paso } from './comun.mjs';

const url = process.env.DATABASE_URL || leerEnv().DATABASE_URL;
if (!url) {
  console.error('✗ Falta DATABASE_URL en server/.env. Ejecuta primero npm run setup.');
  process.exit(1);
}
const esquema = new URL(url).searchParams.get('schema') || 'public';
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(esquema)) {
  console.error('✗ Nombre de esquema no válido en DATABASE_URL.');
  process.exit(1);
}
const host = new URL(url).hostname;
paso(`Recreando el esquema "${esquema}" en ${host}`);
const sql = join(tmpdir(), `trazagen-reset-${process.pid}.sql`);
writeFileSync(sql, `DROP SCHEMA IF EXISTS "${esquema}" CASCADE;\nCREATE SCHEMA "${esquema}";\n`);
try {
  correr(npx, ['prisma', 'db', 'execute', '--file', sql, '--schema', 'prisma/schema.prisma'], SERVER);
} finally {
  rmSync(sql, { force: true });
}
paso('Aplicando migraciones');
correr(npx, ['prisma', 'generate'], SERVER);
correr(npx, ['prisma', 'migrate', 'deploy'], SERVER);
paso('Sembrando datos de demostración');
const detener = await conAfis();
try {
  correr(npm, ['run', 'seed'], SERVER);
} finally {
  detener();
}
console.log('\n\x1b[32m✓ Demo restablecida.\x1b[0m Si la app estaba abierta, vuelve a iniciar sesión.');
