// Normalización y resumen de perfiles STR autosómicos.
// Un perfil es un objeto { locus: [alelos] } con nombres de locus canónicos.

export type Marcadores = Record<string, string[]>;

export const LOCUS_SEXO = 'AMEL';

// 20 loci núcleo de CODIS (FBI, vigentes desde 2017).
export const CODIS_20 = [
  'CSF1PO',
  'D1S1656',
  'D2S441',
  'D2S1338',
  'D3S1358',
  'D5S818',
  'D7S820',
  'D8S1179',
  'D10S1248',
  'D12S391',
  'D13S317',
  'D16S539',
  'D18S51',
  'D19S433',
  'D21S11',
  'D22S1045',
  'FGA',
  'TH01',
  'TPOX',
  'vWA',
] as const;

const OTROS_CONOCIDOS = ['Penta D', 'Penta E', 'SE33', 'D6S1043', 'DYS391'];

// Mínimo de loci comparables para afirmar una coincidencia en la demo.
export const MIN_LOCI_COINCIDENCIA = 10;

const CANONICOS = new Map<string, string>();
for (const nombre of [...CODIS_20, ...OTROS_CONOCIDOS]) {
  CANONICOS.set(clave(nombre), nombre);
}
for (const alias of ['AMEL', 'AMELOGENIN', 'AMELOGENINA']) {
  CANONICOS.set(alias, LOCUS_SEXO);
}
CANONICOS.set('THO1', 'TH01');
CANONICOS.set('PENTAD', 'Penta D');
CANONICOS.set('PENTAE', 'Penta E');

function clave(nombre: string): string {
  return nombre.toUpperCase().replace(/[\s_.-]/g, '');
}

const NOMBRE_VALIDO = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,30}$/;
const ALELO_VALIDO = /^(X|Y|\d{1,2}(\.\d)?|[<>]\d{1,2})$/;

export class ErrorPerfil extends Error {}

export function nombreLocus(bruto: string): string {
  const limpio = bruto.trim();
  if (!NOMBRE_VALIDO.test(limpio) || ['__proto__', 'constructor', 'prototype'].includes(limpio)) {
    throw new ErrorPerfil(`Nombre de marcador no válido: "${bruto}".`);
  }
  return CANONICOS.get(clave(limpio)) ?? limpio;
}

// Excel guarda 16.2 como número y 10 como 10: se pasa todo a texto.
export function textoAlelo(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  let t = typeof valor === 'number' ? String(Math.round(valor * 10) / 10) : String(valor).trim();
  t = t.toUpperCase();
  if (t === '' || t === '**' || t === '-' || t === 'NA' || t === 'N/A') return null;
  return t;
}

function ordenAlelo(a: string): number {
  if (a === 'X') return -2;
  if (a === 'Y') return -1;
  const n = parseFloat(a.replace(/[<>]/g, ''));
  return Number.isNaN(n) ? 999 : n;
}

export function alelosUnicos(valores: unknown[], locus: string): string[] {
  const set = new Set<string>();
  for (const v of valores) {
    const t = textoAlelo(v);
    if (t === null) continue;
    for (const parte of t.split(/[,/;\s]+/).filter(Boolean)) {
      if (!ALELO_VALIDO.test(parte)) {
        throw new ErrorPerfil(`Alelo no válido en ${locus}: "${parte}".`);
      }
      set.add(parte);
    }
  }
  return [...set].sort((a, b) => ordenAlelo(a) - ordenAlelo(b));
}

export function ordenarMarcadores(m: Marcadores): Marcadores {
  const orden = (locus: string) => {
    if (locus === LOCUS_SEXO) return -1;
    const i = (CODIS_20 as readonly string[]).indexOf(locus);
    return i >= 0 ? i : 100;
  };
  const salida: Marcadores = {};
  for (const locus of Object.keys(m).sort((a, b) => orden(a) - orden(b) || a.localeCompare(b))) {
    salida[locus] = m[locus];
  }
  return salida;
}

export type ResumenPerfil = {
  totalLoci: number;
  codisPresentes: number;
  codisFaltantes: string[];
  lociAdicionales: string[];
  sexo: 'XY' | 'XX' | 'sin dato';
  homocigotos: number;
  mezclaSospechosa: boolean;
  lociConMasDeDosAlelos: string[];
  completoCodis: boolean;
};

export function resumir(m: Marcadores): ResumenPerfil {
  const loci = Object.keys(m);
  const codis = CODIS_20 as readonly string[];
  const faltantes = codis.filter((l) => !m[l]?.length);
  const autosomicos = loci.filter((l) => l !== LOCUS_SEXO);
  const masDeDos = autosomicos.filter((l) => m[l].length > 2);
  const amel = m[LOCUS_SEXO] ?? [];
  return {
    totalLoci: autosomicos.length,
    codisPresentes: codis.length - faltantes.length,
    codisFaltantes: faltantes,
    lociAdicionales: autosomicos.filter((l) => !codis.includes(l)),
    sexo: amel.includes('Y') ? 'XY' : amel.includes('X') ? 'XX' : 'sin dato',
    homocigotos: autosomicos.filter((l) => m[l].length === 1).length,
    mezclaSospechosa: masDeDos.length > 0,
    lociConMasDeDosAlelos: masDeDos,
    completoCodis: faltantes.length === 0,
  };
}

export type Comparacion = {
  lociComparados: number;
  lociIguales: number;
  diferencias: string[];
  exacta: boolean;
};

export function comparar(a: Marcadores, b: Marcadores): Comparacion {
  const comunes = Object.keys(a).filter((l) => l !== LOCUS_SEXO && a[l]?.length && b[l]?.length);
  const diferencias = comunes.filter((l) => a[l].join(',') !== b[l].join(','));
  return {
    lociComparados: comunes.length,
    lociIguales: comunes.length - diferencias.length,
    diferencias,
    exacta: comunes.length >= MIN_LOCI_COINCIDENCIA && diferencias.length === 0,
  };
}
