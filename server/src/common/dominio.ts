import { ConflictException } from '@nestjs/common';
import { EstadoSticker, Rol } from '@prisma/client';

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

// Ciclo de vida del sticker (documento de la genetista), con el laboratorio como actor externo:
// NUEVO → PROCESADO (toma y huellas) → EN_USO (llegó el perfil; queda material) → FINALIZADO (sin material).
export const ORDEN_ESTADO: EstadoSticker[] = ['NUEVO', 'PROCESADO', 'EN_USO', 'FINALIZADO'];

// Qué ve cada rol del expediente.
export const puedeVerAlelos = (r: Rol) => r === 'ADMIN' || r === 'LABORATORIO';
export const puedeVerDocumentoCompleto = (r: Rol) => r === 'ADMIN';
export const ocultaDocumento = (r: Rol) => r === 'LABORATORIO';

// Un sticker anulado queda solo de lectura.
export function exigirVigente(s: { anuladoEn: Date | null; codigo?: string }) {
  if (s.anuladoEn) throw new ConflictException('Este sticker está anulado: su registro se conserva, pero ya no admite cambios.');
}
