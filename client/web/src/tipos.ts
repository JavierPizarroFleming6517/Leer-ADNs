export type Marcadores = Record<string, string[]>;
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

export type Minucia = { x: number; y: number; direction: number; type: string };

export type Evento = {
  id: string;
  stickerId: string;
  secuencia: number;
  tipo: string;
  nombre?: string;
  fecha: string;
  responsableId: string;
  responsableNombre: string;
  detalle: Record<string, unknown>;
  archivoSha256: string | null;
  hashAnterior: string;
  hashEvento: string;
};

export type PersonaVista = {
  id: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  documento: string | null;
  documentoVisible: 'completo' | 'enmascarado' | 'oculto';
  pais: string;
  nacionalidad: string;
  fechaNacimiento: string | null;
  anioNacimiento: string | null;
  sexoDeclarado: string | null;
  institucion: string | null;
  createdAt: string;
};

export type Duplicado = { sticker: string; dedo: string; puntaje: number; persona: string | null };

export type HuellaFicha = {
  id: string;
  posicion: number;
  dedo: string;
  sha256Imagen: string;
  sha256Plantilla: string;
  dpi: number;
  origen: 'ESCANER' | 'FOTO';
  ancho: number;
  alto: number;
  archivoNombre: string;
  cantidadMinucias: number;
  minucias: Minucia[];
  creada: string;
  duplicados: Duplicado[];
};

export type Comprobacion = { clave: string; nombre: string; ok: boolean; detalle: string };
export type ResultadoVinculo = {
  valido: boolean;
  comprobaciones: Comprobacion[];
  cambios: { campo: string; antes: string; ahora: string }[];
  vinculoId: string;
  verificadoEn: string;
};

export type VinculoVista = {
  id: string;
  estado: string;
  documento: {
    sticker: string;
    personaId: string;
    huellas: { posicion: number; sha256Imagen: string; sha256Plantilla: string }[];
    perfil: { codigoMuestra: string; kit: string; sha256Canonico: string; sha256Archivo: string };
    firmadoEn: string;
    firmadoPor: { id: string; nombre: string; rol: string };
  };
  documentoCanonico: string;
  documentoSha256: string;
  firma: string;
  llavePublica: string;
  llavePublicaPem: string;
  firmadoEn: string;
  firmadoPor: string;
};

export type FichaSticker = {
  sticker: {
    id: string;
    codigo: string;
    estado: string;
    creado: string;
    vinculadoEn: string | null;
    lote: { id: string; codigo: string; fabrica: string; versionDiseno: string; fechaFabricacion: string };
    plantilla: { nombre: string; pais: string; posiciones: number[] };
  };
  qrUrl: string;
  persona: PersonaVista | null;
  consentimientos: { id: string; versionTexto: string; fechaFirma: string; entidadRevisora: string; archivoNombre: string; archivoSha256: string; createdAt: string }[];
  toma: { fechaHora: string; lugar: string; operador: string; observaciones: string | null; dedosNoObtenibles: { posicion: number; dedo: string; motivo: string }[] } | null;
  huellas: HuellaFicha[];
  muestra: {
    codigo: string;
    laboratorio: string;
    estadoSello: string;
    etapa: string;
    etapaNombre: string;
    etapaDesde: string;
    adnUgMl: number | null;
    kit: string | null;
    loteKit: string | null;
    equipos: string | null;
    tubosAlmacenados: number | null;
    materialRestante: boolean;
    recibida: string;
  } | null;
  perfil: {
    codigoMuestra: string;
    kit: string;
    formato: string;
    archivoNombre: string;
    archivoId: string | null;
    archivoSha256: string;
    cargado: string;
    resumen: Resumen;
    marcadores: Marcadores | null;
    alelosVisibles: boolean;
  } | null;
  adjuntos: { id: string; nombre: string; etapa: string | null; etapaNombre: string | null; sha256: string; tamano: number; interpretado: boolean; createdAt: string }[];
  vinculo: VinculoVista | null;
  vinculosRevocados: { id: string; firmadoEn: string; revocadoEn: string; documentoSha256: string }[];
  custodia: { total: number; ultimoHash: string | null; eventos: Evento[] };
};

export type Catalogos = {
  plantillas: { id: string; nombre: string; pais: string; posiciones: number[] }[];
  kits: { id: string; nombre: string; fabricante: string; loci: string[] }[];
};

export const CODIS_20 = [
  'CSF1PO', 'D1S1656', 'D2S441', 'D2S1338', 'D3S1358', 'D5S818', 'D7S820', 'D8S1179', 'D10S1248', 'D12S391',
  'D13S317', 'D16S539', 'D18S51', 'D19S433', 'D21S11', 'D22S1045', 'FGA', 'TH01', 'TPOX', 'vWA',
];

export const DEDOS: Record<number, string> = {
  1: 'Pulgar derecho',
  2: 'Índice derecho',
  3: 'Medio derecho',
  4: 'Anular derecho',
  5: 'Meñique derecho',
  6: 'Pulgar izquierdo',
  7: 'Índice izquierdo',
  8: 'Medio izquierdo',
  9: 'Anular izquierdo',
  10: 'Meñique izquierdo',
};

export const ETAPAS_LAB = ['RECEPCION_LAB', 'EXTRACCION', 'CUANTIFICACION', 'AMPLIFICACION', 'ELECTROFORESIS', 'INTERPRETACION', 'PERFIL_CARGADO'];
export const NOMBRE_ETAPA: Record<string, string> = {
  FABRICACION: 'Fabricación',
  TOMA: 'Toma de muestra',
  DIGITALIZACION_HUELLAS: 'Digitalización de huella',
  ENVIO: 'Envío al laboratorio',
  RECEPCION_LAB: 'Recepción',
  EXTRACCION: 'Extracción',
  CUANTIFICACION: 'Cuantificación',
  AMPLIFICACION: 'Amplificación',
  ELECTROFORESIS: 'Electroforesis',
  INTERPRETACION: 'Interpretación',
  PERFIL_CARGADO: 'Perfil cargado',
  VINCULO_FIRMADO: 'Vínculo firmado',
  VERIFICACION: 'Verificación',
};
