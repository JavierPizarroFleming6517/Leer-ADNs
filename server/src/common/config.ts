// Configuración leída de server/.env. Los secretos nunca salen de aquí hacia el cliente ni los logs.
import 'dotenv/config';

function req(nombre: string): string {
  const v = process.env[nombre]?.trim();
  if (!v) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Ejecuta "npm run setup" en la raíz o completa server/.env (ver server/.env.example).`,
    );
  }
  return v;
}

function opt(nombre: string, def: string): string {
  return process.env[nombre]?.trim() || def;
}

let cache: ReturnType<typeof cargar> | null = null;

function cargar() {
  const jwtSecret = req('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  const appUrl = opt('APP_URL', 'http://localhost:5173').replace(/\/$/, '');
  return {
    databaseUrl: req('DATABASE_URL'),
    jwtSecret,
    jwtExpira: opt('JWT_EXPIRES_IN', '8h'),
    claveDatos: llave32('DATA_ENCRYPTION_KEY'),
    claveIndice: llave32('BLIND_INDEX_KEY'),
    ed25519Privada: req('ED25519_PRIVATE_KEY'),
    ed25519Publica: req('ED25519_PUBLIC_KEY'),
    appUrl,
    corsOrigenes: opt('CORS_ORIGINS', appUrl)
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean),
    afisUrl: opt('AFIS_URL', 'http://127.0.0.1:7070').replace(/\/$/, ''),
    afisUmbral: Number(opt('AFIS_THRESHOLD', '40')),
    puerto: Number(opt('PORT', '3000')),
  };
}

function llave32(nombre: string): Buffer {
  const b = Buffer.from(req(nombre), 'base64');
  if (b.length !== 32) throw new Error(`${nombre} debe ser una llave de 32 bytes en base64.`);
  return b;
}

export function config() {
  if (!cache) cache = cargar();
  return cache;
}
