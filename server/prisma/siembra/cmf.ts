// Generación de archivos de ejemplo: CMF XML (CODIS Rapid Import), PDF simple y perfiles STR ficticios.
type Marcadores = Record<string, string[]>;

export function construirCmf(muestras: { id: string; marcadores: Marcadores; categoria?: string }[], fecha = new Date()): string {
  const iso = fecha.toISOString().slice(0, 19);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const locusXml = (locus: string, alelos: string[]) => {
    const nombre = locus === 'AMEL' ? 'Amelogenin' : locus;
    return [`    <LOCUS>`, `      <LOCUSNAME>${esc(nombre)}</LOCUSNAME>`, ...alelos.flatMap((a) => [`      <ALLELE>`, `        <ALLELEVALUE>${esc(a)}</ALLELEVALUE>`, `      </ALLELE>`]), `    </LOCUS>`].join('\n');
  };
  const especimenes = muestras.map((m) =>
    [
      `  <SPECIMEN>`,
      `    <SPECIMENID>${esc(m.id)}</SPECIMENID>`,
      `    <SPECIMENCATEGORY>${esc(m.categoria ?? 'Reference')}</SPECIMENCATEGORY>`,
      ...Object.entries(m.marcadores).map(([l, a]) => locusXml(l, a)),
      `  </SPECIMEN>`,
    ].join('\n'),
  );
  return [
    `<?xml version='1.0' encoding='utf-8'?>`,
    `<CODISRapidImportFile xmlns="urn:CODISRapidImportFile-schema">`,
    `  <HEADER>`,
    `    <MESSAGEVERSION>1.0</MESSAGEVERSION>`,
    `    <MESSAGETYPE>Rapid Import</MESSAGETYPE>`,
    `    <MESSAGEID>1</MESSAGEID>`,
    `    <MESSAGEDATETIME>${iso}</MESSAGEDATETIME>`,
    `    <MSGCREATORUSERID>genlab</MSGCREATORUSERID>`,
    `    <DESTINATIONORI>XX000000A</DESTINATIONORI>`,
    `    <SOURCEORI>XX000000A</SOURCEORI>`,
    `  </HEADER>`,
    `  <DEVICE>`,
    `    <INSTRUMENTID>SEQSTUDIO24-01</INSTRUMENTID>`,
    `    <MANUFACTURER>DEMO</MANUFACTURER>`,
    `    <MODEL>Electroforesis capilar</MODEL>`,
    `    <SOFTWAREVERSION>GeneMapper ID-X 1.6</SOFTWAREVERSION>`,
    `  </DEVICE>`,
    ...especimenes,
    `</CODISRapidImportFile>`,
    ``,
  ].join('\n');
}

// PDF mínimo de una página con texto (Helvetica, WinAnsi). Suficiente para un consentimiento de demostración.
export function pdfSimple(titulo: string, lineas: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const contenido = [
    'BT',
    '/F2 16 Tf',
    '56 780 Td',
    `(${esc(titulo)}) Tj`,
    '/F1 10.5 Tf',
    '0 -28 Td',
    '15 TL',
    ...lineas.map((l) => `(${esc(l)}) '`),
    'ET',
  ].join('\n');
  const stream = Buffer.from(contenido, 'latin1');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${contenido}\nendstream`,
  ];
  let salida = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(salida, 'latin1'));
    salida += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(salida, 'latin1');
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) salida += `${String(o).padStart(10, '0')} 00000 n \n`;
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(salida, 'latin1');
}

// Generador pseudoaleatorio determinista (mulberry32): la siembra produce siempre los mismos perfiles.
export function prng(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rangos de alelos frecuentes por locus (valores ficticios, plausibles).
const RANGOS: Record<string, string[]> = {
  CSF1PO: ['8', '9', '10', '11', '12', '13'],
  D1S1656: ['11', '12', '13', '14', '15', '16', '16.3', '17', '17.3', '18.3'],
  D2S441: ['10', '11', '11.3', '12', '13', '14', '15'],
  D2S1338: ['17', '18', '19', '20', '21', '22', '23', '24', '25'],
  D3S1358: ['14', '15', '16', '17', '18'],
  D5S818: ['9', '10', '11', '12', '13'],
  D7S820: ['8', '9', '10', '11', '12'],
  D8S1179: ['10', '11', '12', '13', '14', '15', '16'],
  D10S1248: ['12', '13', '14', '15', '16'],
  D12S391: ['17', '18', '18.3', '19', '20', '21', '22', '23'],
  D13S317: ['8', '9', '10', '11', '12', '13'],
  D16S539: ['9', '10', '11', '12', '13'],
  D18S51: ['12', '13', '14', '15', '16', '17', '18', '19'],
  D19S433: ['12', '13', '13.2', '14', '14.2', '15', '15.2', '16'],
  D21S11: ['28', '29', '30', '30.2', '31', '31.2', '32.2'],
  D22S1045: ['11', '14', '15', '16', '17'],
  FGA: ['19', '20', '21', '22', '22.2', '23', '24', '25'],
  TH01: ['6', '7', '8', '9', '9.3'],
  TPOX: ['8', '9', '10', '11', '12'],
  vWA: ['14', '15', '16', '17', '18', '19'],
  SE33: ['16', '17', '18', '19', '20', '21', '25.2', '27.2', '28.2', '29.2', '30.2'],
};

const ORDEN = (a: string) => parseFloat(a);

// Perfil GlobalFiler completo: AMEL + 20 CODIS + SE33 (+ DYS391 en hombres).
export function perfilGlobalFiler(semilla: number, sexo: 'F' | 'M'): Marcadores {
  const r = prng(semilla * 7919 + 17);
  const m: Marcadores = { AMEL: sexo === 'M' ? ['X', 'Y'] : ['X'] };
  for (const [locus, alelos] of Object.entries(RANGOS)) {
    const a = alelos[Math.floor(r() * alelos.length)];
    const b = alelos[Math.floor(r() * alelos.length)];
    m[locus] = [...new Set([a, b])].sort((x, y) => ORDEN(x) - ORDEN(y));
  }
  if (sexo === 'M') m.DYS391 = [String(10 + Math.floor(r() * 2))];
  return m;
}
