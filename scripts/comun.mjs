// Utilidades compartidas por los scripts de la raíz (setup, dev, demo:*).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SERVER = join(RAIZ, 'server');
export const WEB = join(RAIZ, 'client', 'web');
export const AFIS = join(RAIZ, 'afis');
export const JAR = join(AFIS, 'target', 'afis.jar');
const win = process.platform === 'win32';

export function paso(t) {
  console.log(`\n\x1b[36m▸ ${t}\x1b[0m`);
}

export function correr(cmd, args, cwd = RAIZ, extraEnv = {}) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: win, env: { ...process.env, ...extraEnv } });
  if (r.status !== 0) {
    console.error(`\x1b[31m✗ Falló: ${cmd} ${args.join(' ')}\x1b[0m`);
    process.exit(r.status ?? 1);
  }
}

export function leerEnv() {
  const archivo = join(SERVER, '.env');
  const env = {};
  if (!existsSync(archivo)) return env;
  for (const l of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

export function afisUrl() {
  return (leerEnv().AFIS_URL || 'http://127.0.0.1:7070').replace(/\/$/, '');
}

export function verificarJava() {
  const r = spawnSync('java', ['-version'], { encoding: 'utf8', shell: win });
  const salida = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const m = salida.match(/version "(\d+)/);
  if (r.status !== 0 || !m) {
    console.error('\x1b[31m✗ No se encontró Java. Instala un JDK 17 o superior (p. ej. sudo apt install openjdk-17-jdk).\x1b[0m');
    process.exit(1);
  }
  if (Number(m[1]) < 17) {
    console.error(`\x1b[31m✗ Se necesita JDK 17 o superior (encontrado ${m[1]}).\x1b[0m`);
    process.exit(1);
  }
}

function masNuevo(dir, ref) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (masNuevo(p, ref)) return true;
    } else if (statSync(p).mtimeMs > ref) return true;
  }
  return false;
}

export function compilarAfis(forzar = false) {
  const ref = existsSync(JAR) ? statSync(JAR).mtimeMs : 0;
  if (!forzar && ref && !masNuevo(join(AFIS, 'src'), ref) && statSync(join(AFIS, 'pom.xml')).mtimeMs < ref) return;
  paso('Compilando el microservicio afis (Maven Wrapper)');
  correr(win ? 'mvnw.cmd' : './mvnw', ['-q', '-B', 'package', '-DskipTests'], AFIS);
}

export async function afisVivo(url = afisUrl()) {
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) });
    return r.ok;
  } catch {
    return false;
  }
}

export function lanzarAfis(stdio = 'ignore') {
  const u = new URL(afisUrl());
  return spawn('java', ['-jar', JAR], {
    cwd: AFIS,
    stdio,
    env: { ...process.env, AFIS_HOST: u.hostname, AFIS_PORT: u.port || '7070', AFIS_THRESHOLD: leerEnv().AFIS_THRESHOLD || '40' },
  });
}

// Garantiza que afis responda (lo levanta temporalmente si hace falta). Devuelve una función para detenerlo.
export async function conAfis() {
  if (await afisVivo()) return () => {};
  compilarAfis();
  const p = lanzarAfis();
  // Si el script termina por un error (process.exit), el afis temporal no debe quedar huérfano.
  const detener = () => {
    if (p.exitCode === null) p.kill();
  };
  process.on('exit', detener);
  for (let i = 0; i < 60; i++) {
    if (await afisVivo()) return detener;
    await new Promise((r) => setTimeout(r, 500));
  }
  p.kill();
  console.error('\x1b[31m✗ El microservicio afis no respondió.\x1b[0m');
  process.exit(1);
}

export const npx = win ? 'npx.cmd' : 'npx';
export const npm = win ? 'npm.cmd' : 'npm';
