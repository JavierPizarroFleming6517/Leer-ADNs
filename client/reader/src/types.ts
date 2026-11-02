export type Marcadores = Record<string, string[]>;

export type Expediente = {
  nombreCompleto: string;
  identificador: string;
  fechaNacimiento: string | null;
  nacionalidad: string | null;
  registradoEn: string;
  qrGeneradoEn: string | null;
  perfilGenetico: {
    codigoMuestra: string | null;
    marcadoresSTR: Marcadores;
    resumen: {
      totalLoci: number;
      codisPresentes: number;
      codisFaltantes: string[];
      sexo: 'XY' | 'XX' | 'sin dato';
      completoCodis: boolean;
    };
    formatoOrigen: string | null;
    archivoOrigen: string | null;
    hashArchivo: string | null;
  };
  huellaDactilar: {
    referenciaSimulada: string | null;
    estado: string;
  } | null;
};

export const CODIS_20 = [
  'CSF1PO', 'D1S1656', 'D2S441', 'D2S1338', 'D3S1358', 'D5S818', 'D7S820', 'D8S1179', 'D10S1248', 'D12S391',
  'D13S317', 'D16S539', 'D18S51', 'D19S433', 'D21S11', 'D22S1045', 'FGA', 'TH01', 'TPOX', 'vWA',
];
