import { EstadoSticker, Rol, TipoEvento } from '@prisma/client';

// ANSI/NIST-ITL: códigos de posición de dedo.
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

export const ORDEN_ESTADO: EstadoSticker[] = ['NUEVO', 'PROCESADO', 'EN_USO', 'FINALIZADO'];

export const ETAPAS_LAB: TipoEvento[] = [
  'RECEPCION_LAB',
  'EXTRACCION',
  'CUANTIFICACION',
  'AMPLIFICACION',
  'ELECTROFORESIS',
  'INTERPRETACION',
  'PERFIL_CARGADO',
];

// Qué ve cada rol del expediente.
export const puedeVerAlelos = (r: Rol) => r === 'ADMIN' || r === 'LABORATORIO';
export const puedeVerDocumentoCompleto = (r: Rol) => r === 'ADMIN';
export const ocultaDocumento = (r: Rol) => r === 'LABORATORIO';
