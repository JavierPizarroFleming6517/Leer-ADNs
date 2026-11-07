import { jsonCanonico, sha256 } from '../src/cripto/cripto';
import { CriptoService } from '../src/cripto/cripto.service';
import { sha256Perfil } from '../src/laboratorio/laboratorio.service';
import { VinculosService } from '../src/vinculos/vinculos.service';
import { construirCmf, perfilGlobalFiler } from '../prisma/siembra/cmf';

// Datos mínimos con la forma que VinculosService lee desde la base.
function datos() {
  const marcadores = perfilGlobalFiler(3, 'F');
  const archivo = Buffer.from(construirCmf([{ id: 'M-000003', marcadores }]));
  const huella = (n: number) => ({ posicion: n, imagenOriginal: Buffer.from(`imagen-${n}`), plantilla: Buffer.from(`plantilla-${n}`), sha256Imagen: sha256(`imagen-${n}`), sha256Plantilla: sha256(`plantilla-${n}`) });
  return {
    codigo: 'TG-7K2M-9QXA',
    personaId: 'persona-1',
    huellas: [huella(1), huella(2)],
    perfil: { codigoMuestra: 'M-000003', kit: 'GlobalFiler', marcadores, archivoSha256: sha256(archivo), archivo: { nombre: 'perfil.xml', datos: archivo } },
  };
}

function firmar(cripto: CriptoService, s: ReturnType<typeof datos>) {
  const doc = {
    tipo: 'TrazaGen/VinculoDactilogenetico',
    version: 1,
    sticker: s.codigo,
    personaId: s.personaId,
    huellas: s.huellas.map((h) => ({ posicion: h.posicion, sha256Imagen: h.sha256Imagen, sha256Plantilla: h.sha256Plantilla })),
    perfil: { codigoMuestra: s.perfil.codigoMuestra, kit: s.perfil.kit, sha256Canonico: sha256Perfil(s.perfil.marcadores), sha256Archivo: s.perfil.archivoSha256 },
    firmadoEn: '2026-11-01T12:00:00.000Z',
    firmadoPor: { id: 'u', nombre: 'Dra. Prueba', rol: 'LABORATORIO' },
  };
  const documento = jsonCanonico(doc);
  return { documento, documentoSha256: sha256(documento), firma: cripto.firmador.firmar(documento).toString('base64'), llavePublica: cripto.firmador.publicaB64, personaId: s.personaId };
}

describe('Vínculo dactilogenético firmado', () => {
  const cripto = new CriptoService();
  const servicio = new VinculosService(null as never, cripto, null as never, null as never);

  test('un vínculo recién firmado verifica ✓', async () => {
    const s = datos();
    const r = await servicio.comprobar(s as never, firmar(cripto, s));
    expect(r.valido).toBe(true);
    expect(r.comprobaciones.every((c) => c.ok)).toBe(true);
    expect(r.cambios).toEqual([]);
  });

  test('un alelo cambiado en la base falla ✗ y dice qué locus cambió', async () => {
    const s = datos();
    const v = firmar(cripto, s);
    s.perfil.marcadores = { ...s.perfil.marcadores, D8S1179: ['12', '99'] };
    const r = await servicio.comprobar(s as never, v);
    expect(r.valido).toBe(false);
    expect(r.comprobaciones.find((c) => c.clave === 'perfil')?.ok).toBe(false);
    expect(r.cambios.find((c) => c.campo === 'Locus D8S1179')).toMatchObject({ ahora: '12, 99 (base de datos)' });
  });

  test('una huella reemplazada o una persona cambiada fallan', async () => {
    const s = datos();
    const v = firmar(cripto, s);
    s.huellas[1] = { ...s.huellas[1], imagenOriginal: Buffer.from('otra imagen') };
    const r = await servicio.comprobar(s as never, v);
    expect(r.valido).toBe(false);
    expect(r.cambios[0].campo).toMatch(/Imagen de huella/);
    const s2 = datos();
    const v2 = firmar(cripto, s2);
    s2.personaId = 'persona-2';
    expect((await servicio.comprobar(s2 as never, v2)).valido).toBe(false);
  });

  test('un documento editado o una firma ajena fallan', async () => {
    const s = datos();
    const v = firmar(cripto, s);
    const editado = { ...v, documento: v.documento.replace('Dra. Prueba', 'Dra. Otra') };
    const r = await servicio.comprobar(s as never, editado);
    expect(r.comprobaciones.find((c) => c.clave === 'firma')?.ok).toBe(false);
    expect(r.comprobaciones.find((c) => c.clave === 'documento')?.ok).toBe(false);
    const firmaFalsa = { ...v, firma: Buffer.alloc(64, 7).toString('base64') };
    expect((await servicio.comprobar(s as never, firmaFalsa)).valido).toBe(false);
  });

  test('el archivo original del laboratorio alterado se detecta', async () => {
    const s = datos();
    const v = firmar(cripto, s);
    s.perfil.archivo.datos = Buffer.from(s.perfil.archivo.datos.toString().replace('GeneMapper', 'Genemapper'));
    const r = await servicio.comprobar(s as never, v);
    expect(r.valido).toBe(false);
    expect(r.cambios.some((c) => c.campo.startsWith('Archivo del laboratorio'))).toBe(true);
  });
});
