export type Persona = {
  id: string;
  nombreCompleto: string;
  identificador: string;
  tieneQr: boolean;
};

export type ImportPayload = {
  nombreCompleto: string;
  identificador: string;
  fechaNacimiento?: string;
  alertasClinicas?: {
    alergias?: string[];
    observaciones?: string;
  };
  perfilGenetico: {
    codigoMuestra?: string;
    marcadoresSTR: Record<string, string[]>;
  };
  huellaDactilar?: {
    referenciaSimulada?: string;
    estado: string;
  };
};
