import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const MB = 1024 * 1024;

export const subida = (maxMb: number) => ({ storage: memoryStorage(), limits: { fileSize: maxMb * MB, files: 1, fields: 30 } });

// Multer entrega el nombre en latin1; se pasa a UTF-8 y se limpia.
export function nombreArchivo(f: Express.Multer.File): string {
  return Buffer.from(f.originalname, 'latin1')
    .toString('utf8')
    .replace(/[\\/\0<>:"|?*\u0000-\u001f]/g, '_')
    .slice(0, 180);
}

export function exigirArchivo(f: Express.Multer.File | undefined, campo = 'archivo'): Express.Multer.File {
  if (!f?.buffer?.length) throw new BadRequestException(`Adjunta un archivo en el campo "${campo}".`);
  return f;
}

export function extension(nombre: string): string {
  return (nombre.toLowerCase().split('.').pop() ?? '').slice(0, 10);
}

export function esPdf(b: Buffer) {
  return b.subarray(0, 5).toString('latin1') === '%PDF-';
}

export function tipoImagen(b: Buffer): 'image/png' | 'image/jpeg' | 'image/tiff' | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 4 && ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) || (b[0] === 0x4d && b[1] === 0x4d && b[3] === 0x2a)))
    return 'image/tiff';
  return null;
}

// Prisma tipa Bytes como Uint8Array<ArrayBuffer>; se copia el Buffer para que el tipo calce.
export const bytes = (b: Buffer): Uint8Array<ArrayBuffer> => new Uint8Array(b);
