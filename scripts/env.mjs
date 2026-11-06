// Crea server/.env desde .env.example y completa los secretos y llaves que falten.
// Las llaves se generan localmente y nunca se commitean (.env está en .gitignore).
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ejemplo = join(raiz, 'server', '.env.example');
const destino = join(raiz, 'server', '.env');

export function asegurarEnv() {
  let texto = existsSync(destino) ? readFileSync(destino, 'utf8') : readFileSync(ejemplo, 'utf8');
  const nuevo = !existsSync(destino);
  const valor = (k) => texto.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  const poner = (k, v) => {
    if (new RegExp(`^${k}=`, 'm').test(texto)) texto = texto.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`);
    else texto += `\n${k}=${v}\n`;
  };
  const generados = [];
  if (process.env.DATABASE_URL && nuevo) poner('DATABASE_URL', process.env.DATABASE_URL);
  if (!valor('JWT_SECRET')) (poner('JWT_SECRET', randomBytes(48).toString('base64url')), generados.push('JWT_SECRET'));
  if (!valor('DEMO_PASSWORD')) (poner('DEMO_PASSWORD', `Demo-${randomBytes(4).toString('hex')}`), generados.push('DEMO_PASSWORD'));
  if (!valor('DATA_ENCRYPTION_KEY')) (poner('DATA_ENCRYPTION_KEY', randomBytes(32).toString('base64')), generados.push('DATA_ENCRYPTION_KEY'));
  if (!valor('BLIND_INDEX_KEY')) (poner('BLIND_INDEX_KEY', randomBytes(32).toString('base64')), generados.push('BLIND_INDEX_KEY'));
  if (!valor('ED25519_PRIVATE_KEY') || !valor('ED25519_PUBLIC_KEY')) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    poner('ED25519_PRIVATE_KEY', privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'));
    poner('ED25519_PUBLIC_KEY', publicKey.export({ format: 'der', type: 'spki' }).toString('base64'));
    generados.push('ED25519_PRIVATE_KEY', 'ED25519_PUBLIC_KEY');
  }
  writeFileSync(destino, texto, { mode: 0o600 });
  return { nuevo, generados, demoPassword: valor('DEMO_PASSWORD') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = asegurarEnv();
  console.log(r.nuevo ? 'server/.env creado.' : 'server/.env existente.', r.generados.length ? `Generado: ${r.generados.join(', ')}` : 'Sin cambios.');
}
