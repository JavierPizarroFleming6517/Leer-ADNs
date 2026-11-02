export type Marcadores = Record<string, string[]>;

export type Persona = {
  id: string;
  nombreCompleto: string;
  identificador: string;
  tieneQr: boolean;
  qrGeneradoEn: string | null;
  createdAt: string;
  codigoMuestra: string | null;
  formatoOrigen: string | null;
  codisPresentes: number;
  totalLoci: number;
};

export type Resumen = {
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

export type Coincidencia = {
  personaId: string;
  nombreCompleto: string;
  identificador: string;
  codigoMuestra: string | null;
  lociComparados: number;
};

export type MuestraAnalizada = {
  codigoMuestra: string;
  metadatos: Record<string, string>;
  marcadoresSTR: Marcadores;
  resumen: Resumen;
  coincidencias: Coincidencia[];
};

export type Analisis = {
  archivo: {
    nombre: string;
    tamanoBytes: number;
    sha256: string;
    formato: 'CMF_XML' | 'PLANILLA_XLSX' | 'PLANILLA_CSV';
    formatoNombre: string;
    encabezado: Record<string, string>;
  };
  muestras: MuestraAnalizada[];
};

export type DatosPersona = {
  nombreCompleto: string;
  identificador: string;
  fechaNacimiento: string;
  nacionalidad: string;
};

export const CODIS_20 = [
  'CSF1PO', 'D1S1656', 'D2S441', 'D2S1338', 'D3S1358', 'D5S818', 'D7S820', 'D8S1179', 'D10S1248', 'D12S391',
  'D13S317', 'D16S539', 'D18S51', 'D19S433', 'D21S11', 'D22S1045', 'FGA', 'TH01', 'TPOX', 'vWA',
];

export const NOMBRE_FORMATO: Record<string, string> = {
  CMF_XML: 'CMF XML',
  PLANILLA_XLSX: 'Excel',
  PLANILLA_CSV: 'CSV',
};
