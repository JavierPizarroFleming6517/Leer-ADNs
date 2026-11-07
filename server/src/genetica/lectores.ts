// Lectores de los formatos que entrega un laboratorio, todos hacia el mismo JSON.
//  - CMF XML: formato de importación de CODIS (FBI), espacio de nombres urn:CODISRapidImportFile-schema.
//  - Planilla XLSX/CSV: tabla de genotipos exportada por el software de análisis
//    (una fila por muestra; un locus puede venir en dos columnas o en una celda "15,17").
import ExcelJS from 'exceljs';
import { XMLParser } from 'fast-xml-parser';
import { ErrorPerfil, Marcadores, alelosUnicos, nombreLocus, ordenarMarcadores } from './str';

export type Formato = 'CMF_XML' | 'PLANILLA_XLSX' | 'PLANILLA_CSV';

export const NOMBRE_FORMATO: Record<Formato, string> = {
  CMF_XML: 'CODIS CMF (XML)',
  PLANILLA_XLSX: 'Planilla de genotipos (Excel)',
  PLANILLA_CSV: 'Planilla de genotipos (CSV)',
};

export type MuestraLeida = {
  codigoMuestra: string;
  marcadores: Marcadores;
  metadatos: Record<string, string>;
};

export type ArchivoLeido = {
  formato: Formato;
  encabezado: Record<string, string>;
  muestras: MuestraLeida[];
};

const MAX_MUESTRAS = 500;

export async function leerArchivo(nombre: string, datos: Buffer): Promise<ArchivoLeido> {
  const ext = nombre.toLowerCase().split('.').pop();
  if (ext === 'xml') return leerCmf(datos.toString('utf8'));
  if (ext === 'xlsx') return leerXlsx(datos);
  if (ext === 'csv' || ext === 'txt') return leerCsv(datos.toString('utf8'));
  if (ext === 'fsa' || ext === 'hid') {
    throw new ErrorPerfil(
      'Este es un archivo crudo del secuenciador (electroferograma). Primero debe analizarse en el laboratorio y exportarse como CMF XML o planilla de genotipos.',
    );
  }
  throw new ErrorPerfil('Formato no soportado. Sube un CMF XML, una planilla XLSX o un CSV.');
}

function lista<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function texto(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object' && '#text' in (v as object)) return String((v as { '#text': unknown })['#text']);
  return String(v).trim();
}

export function leerCmf(xml: string): ArchivoLeido {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new ErrorPerfil('El XML no puede contener declaraciones DOCTYPE ni ENTITY.');
  }
  const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
    processEntities: false,
  });
  let doc: Record<string, any>;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new ErrorPerfil('El archivo XML está mal formado.');
  }
  const raiz = doc.CODISRapidImportFile ?? doc.CODISImportFile;
  if (!raiz) {
    throw new ErrorPerfil('El XML no es un archivo CMF de CODIS (falta CODISRapidImportFile).');
  }

  const encabezado: Record<string, string> = {};
  for (const [k, v] of Object.entries(raiz.HEADER ?? {})) encabezado[k] = texto(v);
  for (const [k, v] of Object.entries(raiz.DEVICE ?? {})) encabezado[`DEVICE.${k}`] = texto(v);

  const especimenes = lista(raiz.SPECIMEN);
  if (especimenes.length === 0) throw new ErrorPerfil('El CMF no contiene muestras (SPECIMEN).');
  if (especimenes.length > MAX_MUESTRAS) throw new ErrorPerfil(`Máximo ${MAX_MUESTRAS} muestras por archivo.`);

  const muestras = especimenes.map((s: Record<string, any>, i: number) => {
    const codigo = texto(s.SPECIMENID) || `MUESTRA-${i + 1}`;
    const marcadores: Marcadores = {};
    for (const l of lista<Record<string, any>>(s.LOCUS)) {
      const locus = nombreLocus(texto(l.LOCUSNAME));
      const alelos = alelosUnicos(lista<Record<string, any>>(l.ALLELE).map((a) => texto(a.ALLELEVALUE)), locus);
      if (alelos.length) marcadores[locus] = alelos;
    }
    const metadatos: Record<string, string> = {};
    for (const k of ['SPECIMENCATEGORY', 'SID', 'UNIQUEEVENTID', 'FINGERPRINTDATE']) {
      if (s[k] !== undefined) metadatos[k] = texto(s[k]);
    }
    return { codigoMuestra: codigo, marcadores: ordenarMarcadores(marcadores), metadatos };
  });

  return { formato: 'CMF_XML', encabezado, muestras };
}

async function leerXlsx(datos: Buffer): Promise<ArchivoLeido> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(datos as unknown as ArrayBuffer);
  } catch {
    throw new ErrorPerfil('No se pudo abrir la planilla Excel.');
  }
  // Se toma la primera hoja con perfiles autosómicos (la que trae AMEL o CSF1PO).
  for (const hoja of libro.worksheets) {
    const filas: unknown[][] = [];
    hoja.eachRow({ includeEmpty: false }, (fila) => {
      const valores = (fila.values as unknown[]).slice(1).map((c) =>
        c && typeof c === 'object' && 'result' in (c as object) ? (c as { result: unknown }).result : c,
      );
      filas.push(valores);
    });
    const cab = (filas[0] ?? []).map((c) => String(c ?? '').trim().toUpperCase());
    if (cab.includes('AMEL') || cab.includes('CSF1PO') || cab.includes('AMELOGENIN')) {
      return { formato: 'PLANILLA_XLSX', encabezado: { HOJA: hoja.name }, muestras: tablaAMuestras(filas) };
    }
  }
  throw new ErrorPerfil('La planilla no tiene una hoja con perfiles STR autosómicos (columnas AMEL, CSF1PO, ...).');
}

function leerCsv(t: string): ArchivoLeido {
  const lineas = t.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const sep = (lineas[0]?.match(/;/g)?.length ?? 0) > (lineas[0]?.match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas = lineas.map((l) => partirCsv(l, sep));
  return { formato: 'PLANILLA_CSV', encabezado: {}, muestras: tablaAMuestras(filas) };
}

function partirCsv(linea: string, sep: string): string[] {
  const out: string[] = [];
  let actual = '';
  let comillas = false;
  for (const c of linea) {
    if (c === '"') comillas = !comillas;
    else if (c === sep && !comillas) {
      out.push(actual);
      actual = '';
    } else actual += c;
  }
  out.push(actual);
  return out.map((s) => s.trim());
}

// Primera columna: nombre de muestra. Las columnas con el mismo nombre de locus se juntan.
function tablaAMuestras(filas: unknown[][]): MuestraLeida[] {
  if (filas.length < 2) throw new ErrorPerfil('La planilla no tiene filas de muestras.');
  if (filas.length - 1 > MAX_MUESTRAS) throw new ErrorPerfil(`Máximo ${MAX_MUESTRAS} muestras por archivo.`);
  const cab = filas[0].map((c) => String(c ?? '').trim());
  const columnas: { locus: string; indice: number }[] = [];
  cab.forEach((nombre, i) => {
    if (i === 0 || !nombre) return;
    columnas.push({ locus: nombreLocus(nombre), indice: i });
  });

  const muestras: MuestraLeida[] = [];
  for (const fila of filas.slice(1)) {
    const codigo = String(fila[0] ?? '').trim();
    if (!codigo) continue;
    const porLocus = new Map<string, unknown[]>();
    for (const { locus, indice } of columnas) {
      porLocus.set(locus, [...(porLocus.get(locus) ?? []), fila[indice]]);
    }
    const marcadores: Marcadores = {};
    for (const [locus, valores] of porLocus) {
      const alelos = alelosUnicos(valores, locus);
      if (alelos.length) marcadores[locus] = alelos;
    }
    if (Object.keys(marcadores).length) {
      muestras.push({ codigoMuestra: codigo, marcadores: ordenarMarcadores(marcadores), metadatos: {} });
    }
  }
  if (!muestras.length) throw new ErrorPerfil('No se encontraron muestras con alelos en la planilla.');
  return muestras;
}
