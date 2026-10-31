export type Expediente = {
  nombreCompleto: string;
  identificador: string;
  fechaNacimiento: string | null;
  alertasClinicas: {
    alergias?: string[];
    observaciones?: string;
  } | null;
  perfilGenetico: {
    codigoMuestra: string | null;
    marcadoresSTR: Record<string, unknown>;
  };
  huellaDactilar: {
    referenciaSimulada: string | null;
    estado: string;
  } | null;
};
