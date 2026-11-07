// Catálogos y usuarios de demostración.
import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export const CODIS_20 = [
  'CSF1PO', 'D1S1656', 'D2S441', 'D2S1338', 'D3S1358', 'D5S818', 'D7S820', 'D8S1179', 'D10S1248', 'D12S391',
  'D13S317', 'D16S539', 'D18S51', 'D19S433', 'D21S11', 'D22S1045', 'FGA', 'TH01', 'TPOX', 'vWA',
];

export const KITS = [
  {
    nombre: 'GlobalFiler',
    fabricante: 'Thermo Fisher Scientific (Applied Biosystems)',
    loci: ['AMEL', 'CSF1PO', 'D1S1656', 'D2S441', 'D2S1338', 'D3S1358', 'D5S818', 'D7S820', 'D8S1179', 'D10S1248', 'D12S391', 'D13S317', 'D16S539', 'D18S51', 'D19S433', 'D21S11', 'D22S1045', 'FGA', 'SE33', 'TH01', 'TPOX', 'vWA', 'DYS391'],
  },
  {
    nombre: 'PowerPlex Fusion',
    fabricante: 'Promega',
    loci: ['AMEL', ...CODIS_20, 'Penta D', 'Penta E', 'DYS391'],
  },
  {
    nombre: 'Identifiler Plus',
    fabricante: 'Thermo Fisher Scientific (Applied Biosystems)',
    loci: ['AMEL', 'CSF1PO', 'D2S1338', 'D3S1358', 'D5S818', 'D7S820', 'D8S1179', 'D13S317', 'D16S539', 'D18S51', 'D19S433', 'D21S11', 'FGA', 'TH01', 'TPOX', 'vWA'],
  },
];

export const PLANTILLAS = [
  { nombre: 'Chile — 10 dedos', pais: 'Chile', posiciones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { nombre: 'Internacional — 5 dedos (mano derecha)', pais: 'Internacional', posiciones: [1, 2, 3, 4, 5] },
];

export const USUARIOS: { clave: string; nombre: string; email: string; rol: Rol; institucion: string }[] = [
  { clave: 'admin', nombre: 'Camila Rojas', email: 'admin@trazagen.cl', rol: 'ADMIN', institucion: 'TrazaGen' },
  { clave: 'operador', nombre: 'Diego Fuentes', email: 'operador@trazagen.cl', rol: 'OPERADOR_TOMA', institucion: 'TrazaGen · Unidad de toma' },
  { clave: 'laboratorio', nombre: 'Dra. Valentina Soto', email: 'laboratorio@genlab.cl', rol: 'LABORATORIO', institucion: 'GenLab Santiago' },
  { clave: 'verificador', nombre: 'Andrés Muñoz', email: 'verificador@trazagen.cl', rol: 'VERIFICADOR', institucion: 'TrazaGen · Verificación' },
];

export async function sembrarBase(prisma: PrismaClient) {
  const password = process.env.DEMO_PASSWORD?.trim();
  if (!password || password.length < 8) throw new Error('Define DEMO_PASSWORD (mínimo 8 caracteres) en server/.env.');
  const hash = await bcrypt.hash(password, 12);
  const usuarios: Record<string, { id: string; nombre: string; email: string; rol: Rol }> = {};
  for (const u of USUARIOS) {
    const r = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, nombre: u.nombre, rol: u.rol, institucion: u.institucion, activo: u.rol === 'ADMIN' },
      create: { nombre: u.nombre, email: u.email, rol: u.rol, institucion: u.institucion, passwordHash: hash, activo: u.rol === 'ADMIN' },
    });
    usuarios[u.clave] = { id: r.id, nombre: r.nombre, email: r.email, rol: r.rol };
  }
  for (const k of KITS) await prisma.kit.upsert({ where: { nombre: k.nombre }, update: k, create: k });
  const plantillas: Record<string, string> = {};
  for (const p of PLANTILLAS) {
    const r = await prisma.plantillaSticker.upsert({ where: { nombre: p.nombre }, update: p, create: p });
    plantillas[p.pais] = r.id;
  }
  return { usuarios, plantillas };
}
