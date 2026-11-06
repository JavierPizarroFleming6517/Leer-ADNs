// npm run demo:ejemplos · Genera los archivos FIJOS de examples/demo, ordenados por paso de la guía.
// Solo hace falta correrlo si cambia algo de la demo: los archivos ya están en el repositorio y
// la siembra no los modifica. Requiere el motor afis en marcha (convierte las TIFF de FVC2002 a PNG).
import 'dotenv/config';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { construirCmf, pdfSimple, perfilGlobalFiler } from '../prisma/siembra/cmf';
import { CODIGOS_DEMO, SPECIMEN_OTRA_MUESTRA } from '../prisma/siembra/codigos';
import { DESCONOCIDO, DPI, DUPLICADO_TOMA, Dedo, RESERVA_TOMA, VERIFICAR, ruta } from '../prisma/siembra/demo';

const DEMO = join(__dirname, '..', '..', 'examples', 'demo');
const FECHA = new Date('2026-11-02T09:00:00Z');
const AFIS = (process.env.AFIS_URL || 'http://127.0.0.1:7070').replace(/\/$/, '');

async function png(d: Dedo, impresion: number): Promise<Buffer> {
  const r = await fetch(`${AFIS}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: readFileSync(ruta(d, impresion)).toString('base64'), dpi: DPI[d.db] }),
  });
  if (!r.ok) throw new Error('El motor afis no respondió. Levántalo con npm run dev.');
  return Buffer.from(((await r.json()) as { png: string }).png, 'base64');
}

async function main() {
  for (const d of ['paso3_toma', 'paso4_laboratorio', 'paso6_verificacion']) rmSync(join(DEMO, d), { recursive: true, force: true });
  const escribir = (rel: string, datos: Buffer | string) => {
    mkdirSync(join(DEMO, rel, '..'), { recursive: true });
    writeFileSync(join(DEMO, rel), datos);
    console.log(`  ✓ examples/demo/${rel}`);
  };

  escribir(
    'paso3_toma/consentimiento_firmado.pdf',
    pdfSimple('Consentimiento informado · TrazaGen', [
      'Versión 3.2 del texto aprobado por el Comité Ético Científico.',
      '',
      'La persona autoriza la toma de huellas dactilares y de una muestra de células',
      'epiteliales mediante el sticker TrazaGen, para generar su identificación',
      'dactilogenética. Sus datos personales se guardan cifrados y separados.',
      '',
      'Firma: ______________________     Fecha: ____ / ____ / ______',
      '',
      'Documento ficticio para la demostración de TrazaGen.',
    ]),
  );
  escribir('paso3_toma/huella_indice_derecho.png', await png(RESERVA_TOMA, 1));
  escribir('paso3_toma/huella_medio_derecho_repetida.png', await png(DUPLICADO_TOMA, 3));

  escribir('paso4_laboratorio/1_resultado_de_otra_muestra.xml', construirCmf([{ id: SPECIMEN_OTRA_MUESTRA, marcadores: perfilGlobalFiler(202, 'M') }], FECHA));
  escribir(`paso4_laboratorio/2_resultado_${CODIGOS_DEMO.enVivo}.xml`, construirCmf([{ id: CODIGOS_DEMO.enVivo, marcadores: perfilGlobalFiler(301, 'F') }], FECHA));

  escribir('paso6_verificacion/1_huella_registrada.png', await png(VERIFICAR, 5));
  escribir('paso6_verificacion/2_huella_desconocida.png', await png(DESCONOCIDO, 2));
  // Perfil de la 5.ª persona sembrada (Camila Andrea Vargas Peña): misma semilla que la siembra.
  escribir('paso6_verificacion/3_perfil_registrado.xml', construirCmf([{ id: 'CONSULTA-2026-0912', marcadores: perfilGlobalFiler(5, 'F'), categoria: 'Query' }], FECHA));
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e);
  process.exit(1);
});
