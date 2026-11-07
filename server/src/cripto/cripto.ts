// Primitivas criptográficas de TrazaGen (Node crypto, sin dependencias externas).
import {
  KeyObject,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  verify,
} from 'crypto';

export function sha256(datos: Buffer | string): string {
  return createHash('sha256').update(datos).digest('hex');
}

// JSON canónico: claves ordenadas en todos los niveles, sin espacios. Base de hashes y firmas.
export function jsonCanonico(valor: unknown): string {
  return JSON.stringify(ordenar(valor));
}

function ordenar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(ordenar);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const salida: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) salida[k] = ordenar(x);
    }
    return salida;
  }
  if (v instanceof Date) return v.toISOString();
  return v;
}

// ------------------------------------------------------------- AES-256-GCM

const PREFIJO = 'v1';

export class Cifrador {
  constructor(private readonly llave: Buffer) {
    if (llave.length !== 32) throw new Error('La llave AES-256 debe tener 32 bytes.');
  }

  cifrar(texto: string): string {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.llave, iv);
    const ct = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
    const tag = c.getAuthTag();
    return [PREFIJO, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
  }

  descifrar(paquete: string): string {
    const [v, iv, tag, ct] = paquete.split(':');
    if (v !== PREFIJO || !iv || !tag || ct === undefined) throw new Error('Formato de dato cifrado no válido.');
    const d = createDecipheriv('aes-256-gcm', this.llave, Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
  }
}

// ------------------------------------------------------------- Índice ciego

export function normalizarDocumento(numero: string): string {
  return numero.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

// HMAC-SHA256 del documento normalizado: permite buscar y detectar duplicados sin descifrar.
export function indiceCiego(llave: Buffer, tipo: string, numero: string, pais: string): string {
  const entrada = `${tipo.trim().toUpperCase()}|${pais.trim().toUpperCase()}|${normalizarDocumento(numero)}`;
  return createHmac('sha256', llave).update(entrada).digest('hex');
}

// ------------------------------------------------------------- Ed25519

export class Firmador {
  private readonly privada: KeyObject;
  readonly publica: KeyObject;
  readonly publicaB64: string;

  constructor(privadaB64: string, publicaB64: string) {
    this.privada = createPrivateKey({ key: Buffer.from(privadaB64, 'base64'), format: 'der', type: 'pkcs8' });
    this.publica = createPublicKey({ key: Buffer.from(publicaB64, 'base64'), format: 'der', type: 'spki' });
    this.publicaB64 = publicaB64;
    // La llave pública configurada debe corresponder a la privada.
    const prueba = Buffer.from('trazagen');
    if (!verify(null, prueba, this.publica, sign(null, prueba, this.privada))) {
      throw new Error('ED25519_PUBLIC_KEY no corresponde a ED25519_PRIVATE_KEY.');
    }
  }

  firmar(datos: string | Buffer): Buffer {
    return sign(null, Buffer.isBuffer(datos) ? datos : Buffer.from(datos, 'utf8'), this.privada);
  }

  verificar(datos: string | Buffer, firma: Buffer, publicaB64?: string): boolean {
    try {
      const llave = publicaB64
        ? createPublicKey({ key: Buffer.from(publicaB64, 'base64'), format: 'der', type: 'spki' })
        : this.publica;
      return verify(null, Buffer.isBuffer(datos) ? datos : Buffer.from(datos, 'utf8'), llave, firma);
    } catch {
      return false;
    }
  }

  publicaPem(): string {
    return this.publica.export({ type: 'spki', format: 'pem' }).toString();
  }
}

export function base64url(b: Buffer): string {
  return b.toString('base64url');
}

export function desdeBase64url(s: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  return Buffer.from(s, 'base64url');
}

// ------------------------------------------------------------- Código de sticker

// Crockford base32: sin I, L, O ni U para evitar confusiones al leer o dictar.
export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const PATRON_CODIGO = /^TG-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function codigoSticker(): string {
  const b = randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += CROCKFORD[b[i] & 31];
  return `TG-${s.slice(0, 4)}-${s.slice(4)}`;
}

// Normaliza lo que alguien tipeó a mano: minúsculas, O→0, I/L→1, espacios.
export function normalizarCodigo(entrada: string): string {
  const limpio = entrada
    .toUpperCase()
    .replace(/[\s_]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  const m = limpio.match(/^TG-?([0-9A-Z]{4})-?([0-9A-Z]{4})$/);
  return m ? `TG-${m[1]}-${m[2]}` : limpio;
}

export const TEXTO_FIRMA_QR = (codigo: string) => `TrazaGen/QR/v1:${codigo}`;
