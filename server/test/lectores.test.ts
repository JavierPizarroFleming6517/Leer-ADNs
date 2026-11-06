import { readFileSync } from 'fs';
import { join } from 'path';
import { ErrorPerfil, resumir } from '../src/genetica/str';
import { leerArchivo, leerCmf } from '../src/genetica/lectores';
import { lociFueraDeKit, muestraDelArchivo } from '../src/laboratorio/laboratorio.service';
import { KITS } from '../prisma/siembra/base';
import { construirCmf, perfilGlobalFiler } from '../prisma/siembra/cmf';

const EJ = join(__dirname, '..', '..', 'examples');

describe('Lectores de archivos de laboratorio', () => {
  test('CMF XML y planilla XLSX de ejemplo producen exactamente el mismo JSON', async () => {
    const xml = await leerArchivo('lote.xml', readFileSync(join(EJ, 'cmf_lote_laboratorio.xml')));
    const xlsx = await leerArchivo('lote.xlsx', readFileSync(join(EJ, 'planilla_genotipos_laboratorio.xlsx')));
    expect(xml.formato).toBe('CMF_XML');
    expect(xlsx.formato).toBe('PLANILLA_XLSX');
    expect(xml.muestras).toHaveLength(11);
    expect(xlsx.muestras.map((m) => [m.codigoMuestra, m.marcadores])).toEqual(xml.muestras.map((m) => [m.codigoMuestra, m.marcadores]));
  });

  test('CSV con dos columnas por locus, separador ; y alelos con decimales', async () => {
    const csv = 'Sample Name;AMEL;AMEL;D19S433;D19S433;TH01;TH01\nM-000123;X;Y;13;14.2;9.3;9.3\n';
    const r = await leerArchivo('perfil.csv', Buffer.from(csv));
    expect(r.formato).toBe('PLANILLA_CSV');
    expect(r.muestras[0]).toMatchObject({ codigoMuestra: 'M-000123', marcadores: { AMEL: ['X', 'Y'], D19S433: ['13', '14.2'], TH01: ['9.3'] } });
  });

  test('normaliza nombres de loci (Amelogenin → AMEL, THO1 → TH01) y cuenta CODIS', () => {
    const m = perfilGlobalFiler(1, 'M');
    const r = leerCmf(construirCmf([{ id: 'M-000001', marcadores: m }]));
    expect(r.muestras[0].marcadores).toEqual(m);
    expect(resumir(r.muestras[0].marcadores)).toMatchObject({ codisPresentes: 20, completoCodis: true, sexo: 'XY' });
  });

  test('rechaza XML con DTD o entidades, y archivos crudos .fsa', async () => {
    const malo = `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><CODISRapidImportFile>&e;</CODISRapidImportFile>`;
    expect(() => leerCmf(malo)).toThrow(ErrorPerfil);
    await expect(leerArchivo('crudo.fsa', Buffer.from('ABIF'))).rejects.toThrow(/crudo del secuenciador/);
  });

  test('rechaza alelos y nombres de locus no válidos', () => {
    const m = { AMEL: ['X'], 'D8S1179': ['12;DROP'] };
    expect(() => leerCmf(construirCmf([{ id: 'M-1', marcadores: m }]))).toThrow(ErrorPerfil);
    expect(() => leerCmf(construirCmf([{ id: 'M-1', marcadores: { __proto__x: ['1'] } as never }]).replace('__proto__x', '__proto__'))).toThrow(ErrorPerfil);
  });
});

describe('Validación de custodia: muestra del archivo vs. muestra del sticker', () => {
  const marcadores = perfilGlobalFiler(7, 'F');

  test('acepta el archivo cuyo SPECIMENID es la muestra del sticker (sin importar mayúsculas)', () => {
    const leido = leerCmf(construirCmf([{ id: 'm-000009', marcadores }]));
    expect(muestraDelArchivo(leido, 'M-000009').marcadores).toEqual(marcadores);
  });

  test('en un lote con varias muestras toma solo la del sticker', () => {
    const leido = leerCmf(construirCmf([{ id: 'M-000001', marcadores: perfilGlobalFiler(1, 'M') }, { id: 'M-000009', marcadores }]));
    expect(muestraDelArchivo(leido, 'M-000009').marcadores).toEqual(marcadores);
  });

  test('rechaza un archivo de otra muestra', () => {
    const leido = leerCmf(construirCmf([{ id: 'M-000431', marcadores }]));
    expect(() => muestraDelArchivo(leido, 'M-000009')).toThrow(/El archivo corresponde a otra muestra/);
  });

  test('valida los loci contra el kit declarado', () => {
    const gf = KITS.find((k) => k.nombre === 'GlobalFiler')!.loci;
    const idp = KITS.find((k) => k.nombre === 'Identifiler Plus')!.loci;
    expect(lociFueraDeKit(marcadores, gf).fuera).toEqual([]);
    expect(lociFueraDeKit(marcadores, idp).fuera).toEqual(expect.arrayContaining(['D1S1656', 'SE33']));
    const pp = KITS.find((k) => k.nombre === 'PowerPlex Fusion')!.loci;
    expect(lociFueraDeKit(marcadores, pp).faltantes).toEqual(expect.arrayContaining(['Penta D', 'Penta E']));
  });
});

describe('Loci Y-STR', () => {
  test('en un perfil XX no se reporta DYS391 como faltante', () => {
    const gf = KITS.find((k) => k.nombre === 'GlobalFiler')!.loci;
    expect(lociFueraDeKit(perfilGlobalFiler(5, 'F'), gf).faltantes).toEqual([]);
    const sinDys = { ...perfilGlobalFiler(6, 'M') };
    delete sinDys.DYS391;
    expect(lociFueraDeKit(sinDys, gf).faltantes).toEqual(['DYS391']);
  });
});
