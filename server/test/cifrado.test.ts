import { randomBytes } from 'crypto';
import { Cifrador, indiceCiego } from '../src/cripto/cripto';

describe('Cifrado AES-256-GCM de datos sensibles', () => {
  const llave = randomBytes(32);
  const c = new Cifrador(llave);

  test('cifra y descifra; el texto no aparece en el resultado', () => {
    const x = c.cifrar('31.482.937-6');
    expect(x).toMatch(/^v1:/);
    expect(x).not.toContain('31.482');
    expect(c.descifrar(x)).toBe('31.482.937-6');
  });

  test('el mismo dato cifrado dos veces da resultados distintos (IV aleatorio)', () => {
    expect(c.cifrar('1990-03-14')).not.toBe(c.cifrar('1990-03-14'));
  });

  test('un byte alterado o una llave distinta hacen fallar el descifrado (autenticación GCM)', () => {
    const x = c.cifrar('G48120394');
    const [v, iv, tag, ct] = x.split(':');
    const b = Buffer.from(ct, 'base64');
    b[0] ^= 1;
    expect(() => c.descifrar([v, iv, tag, b.toString('base64')].join(':'))).toThrow();
    expect(() => new Cifrador(randomBytes(32)).descifrar(x)).toThrow();
  });

  test('rechaza llaves que no sean de 32 bytes', () => {
    expect(() => new Cifrador(randomBytes(16))).toThrow();
  });
});

describe('Índice ciego HMAC-SHA256 del documento', () => {
  const llave = randomBytes(32);

  test('es determinista e ignora puntos, guiones, espacios y mayúsculas', () => {
    const a = indiceCiego(llave, 'RUN', '31.482.937-k', 'Chile');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(indiceCiego(llave, 'run', '31482937K', 'CHILE')).toBe(a);
    expect(indiceCiego(llave, 'RUN', ' 31 482 937 K ', 'chile ')).toBe(a);
  });

  test('distingue tipo, país y número; no es reversible sin la llave', () => {
    const a = indiceCiego(llave, 'RUN', '31482937K', 'Chile');
    expect(indiceCiego(llave, 'PASAPORTE', '31482937K', 'Chile')).not.toBe(a);
    expect(indiceCiego(llave, 'RUN', '31482937K', 'Perú')).not.toBe(a);
    expect(indiceCiego(llave, 'RUN', '31482938K', 'Chile')).not.toBe(a);
    expect(indiceCiego(randomBytes(32), 'RUN', '31482937K', 'Chile')).not.toBe(a);
  });
});
