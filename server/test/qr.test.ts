import { CROCKFORD, PATRON_CODIGO, codigoSticker, normalizarCodigo } from '../src/cripto/cripto';
import { CriptoService } from '../src/cripto/cripto.service';

describe('QR firmado del sticker', () => {
  const cripto = new CriptoService();

  test('el código es aleatorio, con formato TG-XXXX-XXXX en Crockford base32', () => {
    const codigos = new Set(Array.from({ length: 2000 }, () => codigoSticker()));
    expect(codigos.size).toBe(2000);
    for (const c of codigos) {
      expect(c).toMatch(PATRON_CODIGO);
      for (const ch of c.replace(/^TG-|-/g, '')) expect(CROCKFORD).toContain(ch);
      expect(c).not.toMatch(/[ILOU]/);
    }
  });

  test('la URL contiene solo el código y la firma Ed25519 en base64url', () => {
    const url = cripto.urlQr('TG-7K2M-9QXA');
    const m = url.match(/^https:\/\/trazagen\.test\/s\/(TG-7K2M-9QXA)\.([A-Za-z0-9_-]+)$/);
    expect(m).not.toBeNull();
    expect(Buffer.from(m![2], 'base64url')).toHaveLength(64);
    expect(cripto.verificarFirmaQr(m![1], m![2])).toBe(true);
  });

  test('una firma alterada, de otro código o truncada se rechaza', () => {
    const firma = cripto.firmaQr('TG-7K2M-9QXA');
    const alterada = (firma[0] === 'A' ? 'B' : 'A') + firma.slice(1);
    expect(cripto.verificarFirmaQr('TG-7K2M-9QXA', alterada)).toBe(false);
    expect(cripto.verificarFirmaQr('TG-7K2M-9QXB', firma)).toBe(false);
    expect(cripto.verificarFirmaQr('TG-7K2M-9QXA', firma.slice(0, 40))).toBe(false);
    expect(cripto.verificarFirmaQr('TG-7K2M-9QXA', 'no+es/base64url')).toBe(false);
  });

  test('una firma hecha con otra llave no es válida', () => {
    const firma = cripto.firmaQr('TG-7K2M-9QXA');
    const { generateKeyPairSync } = require('crypto');
    const otra = generateKeyPairSync('ed25519');
    const ant = { ...process.env };
    process.env.ED25519_PRIVATE_KEY = otra.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
    process.env.ED25519_PUBLIC_KEY = otra.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    jest.resetModules();
    const { CriptoService: Otra } = require('../src/cripto/cripto.service');
    const ajena = new Otra();
    expect(ajena.verificarFirmaQr('TG-7K2M-9QXA', firma)).toBe(false);
    expect(cripto.verificarFirmaQr('TG-7K2M-9QXA', ajena.firmaQr('TG-7K2M-9QXA'))).toBe(false);
    Object.assign(process.env, ant);
  });

  test('normaliza códigos escritos a mano (minúsculas, O→0, I/L→1, sin guiones)', () => {
    expect(normalizarCodigo('tg-7k2m-9qxa')).toBe('TG-7K2M-9QXA');
    expect(normalizarCodigo('TG 7K2M 9QXA'.replace(/ /g, '-'))).toBe('TG-7K2M-9QXA');
    expect(normalizarCodigo('tg7k2m9qxo')).toBe('TG-7K2M-9QX0');
    expect(normalizarCodigo('TG-IL00-0000')).toBe('TG-1100-0000');
  });
});
