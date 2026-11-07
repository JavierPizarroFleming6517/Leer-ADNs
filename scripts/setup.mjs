// npm run setup: instala todo, genera secretos y llaves, compila afis, migra y siembra.
import { RAIZ, SERVER, WEB, conAfis, compilarAfis, correr, npm, npx, paso, verificarJava } from './comun.mjs';
import { asegurarEnv } from './env.mjs';

const [mayor] = process.versions.node.split('.').map(Number);
if (mayor < 20) {
  console.error(`✗ Se necesita Node.js 20 o superior (tienes ${process.versions.node}).`);
  process.exit(1);
}
verificarJava();

paso('Instalando dependencias (raíz, server, client/web)');
correr(npm, ['install', '--no-audit', '--no-fund'], RAIZ);
correr(npm, ['install', '--no-audit', '--no-fund'], SERVER);
correr(npm, ['install', '--no-audit', '--no-fund'], WEB);

paso('Configurando server/.env (secretos y llaves Ed25519)');
const env = asegurarEnv();
console.log(env.nuevo ? '  server/.env creado.' : '  server/.env ya existía.', env.generados.length ? `Generado: ${env.generados.join(', ')}` : 'Sin cambios.');
console.log(`  Base de datos: ${env.baseDatos}  (DATABASE_URL en server/.env)`);

compilarAfis(true);

paso('Base de datos: migraciones (incluye el trigger de custodia)');
correr(npx, ['prisma', 'generate'], SERVER);
correr(npx, ['prisma', 'migrate', 'deploy'], SERVER);

paso('Siembra de demostración (usa SourceAFIS para las huellas)');
const detener = await conAfis();
try {
  correr(npm, ['run', 'seed'], SERVER);
} finally {
  detener();
}

console.log(`
\x1b[32m✓ TrazaGen listo.\x1b[0m
  Inicia todo con:   npm run dev
  App web:           http://localhost:5173
  Contraseña demo:   ${env.demoPassword}  (DEMO_PASSWORD en server/.env)
`);
