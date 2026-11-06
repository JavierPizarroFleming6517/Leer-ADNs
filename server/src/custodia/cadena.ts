// Cadena de hashes de la custodia: cada evento incluye el hash del anterior del mismo sticker.
import { jsonCanonico, sha256 } from '../cripto/cripto';

export const GENESIS = '0'.repeat(64);

export type ContenidoEvento = {
  stickerId: string;
  secuencia: number;
  tipo: string;
  fecha: string;
  responsableId: string;
  responsableNombre: string;
  detalle: unknown;
  archivoSha256: string | null;
  hashAnterior: string;
};

export function hashEvento(c: ContenidoEvento): string {
  return sha256(jsonCanonico({ ...c, version: 'TrazaGen/Custodia/v1' }));
}

export type EventoGuardado = Omit<ContenidoEvento, 'fecha'> & { fecha: Date | string; hashEvento: string };

export type ResultadoCadena = {
  integra: boolean;
  eventos: number;
  ultimoHash: string | null;
  errores: { secuencia: number; tipo: string; motivo: string }[];
};

// Recorre los eventos en orden y comprueba hash propio y enlace con el anterior.
export function verificarCadena(eventos: EventoGuardado[]): ResultadoCadena {
  const ordenados = [...eventos].sort((a, b) => a.secuencia - b.secuencia);
  const errores: ResultadoCadena['errores'] = [];
  let anterior = GENESIS;
  ordenados.forEach((e, i) => {
    if (e.secuencia !== i + 1) {
      errores.push({ secuencia: e.secuencia, tipo: e.tipo, motivo: `Falta un evento: se esperaba la secuencia ${i + 1}.` });
    }
    if (e.hashAnterior !== anterior) {
      errores.push({ secuencia: e.secuencia, tipo: e.tipo, motivo: 'El hash anterior no coincide con el evento previo.' });
    }
    const calculado = hashEvento({
      stickerId: e.stickerId,
      secuencia: e.secuencia,
      tipo: e.tipo,
      fecha: typeof e.fecha === 'string' ? e.fecha : e.fecha.toISOString(),
      responsableId: e.responsableId,
      responsableNombre: e.responsableNombre,
      detalle: e.detalle,
      archivoSha256: e.archivoSha256,
      hashAnterior: e.hashAnterior,
    });
    if (calculado !== e.hashEvento) {
      errores.push({ secuencia: e.secuencia, tipo: e.tipo, motivo: 'El contenido del evento no corresponde a su hash.' });
    }
    anterior = e.hashEvento;
  });
  return {
    integra: errores.length === 0,
    eventos: ordenados.length,
    ultimoHash: ordenados.length ? ordenados[ordenados.length - 1].hashEvento : null,
    errores,
  };
}
