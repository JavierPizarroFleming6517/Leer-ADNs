// npm run test:afis · Evalúa el microservicio afis con datos reales de FVC2002 (sets B, DB1–DB4).
// Genuinos: impresión _1 contra _2.._8 del mismo dedo. Impostores: _1 de cada dedo contra _1 de todos los demás.
// Requiere afis en marcha (npm run dev) o lo levanta temporalmente.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, afisUrl, conAfis } from './comun.mjs';

const DPI = { DB1_B: 500, DB2_B: 569, DB3_B: 500, DB4_B: 500 };
const UMBRAL = Number(process.env.AFIS_THRESHOLD || 40);
const url = afisUrl();
const detener = await conAfis();

async function post(ruta, cuerpo) {
  const r = await fetch(url + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  if (!r.ok) throw new Error(`${ruta}: ${r.status} ${await r.text()}`);
  return r.json();
}

try {
  const plantillas = {};
  const minucias = [];
  for (const db of Object.keys(DPI)) {
    for (let d = 101; d <= 110; d++) {
      for (let i = 1; i <= 8; i++) {
        const img = readFileSync(join(RAIZ, 'datasets', 'fvc2002', db, `${d}_${i}.tif`));
        const e = await post('/extract', { image: img.toString('base64'), dpi: DPI[db] });
        plantillas[`${db}/${d}_${i}`] = e.template;
        minucias.push(e.minutiaCount);
      }
    }
  }
  const dedos = Object.keys(DPI).flatMap((db) => Array.from({ length: 10 }, (_, k) => `${db}/${101 + k}`));
  const genuinos = [];
  for (const f of dedos) {
    const r = await post('/identify', { probe: plantillas[`${f}_1`], threshold: UMBRAL, candidates: [2, 3, 4, 5, 6, 7, 8].map((i) => ({ id: `${f}_${i}`, template: plantillas[`${f}_${i}`] })) });
    genuinos.push(...r.results.map((x) => ({ par: `${f}_1 vs ${x.id.split('/')[1]}`, db: f.split('/')[0], puntaje: x.score })));
  }
  const impostores = [];
  for (const f of dedos) {
    const r = await post('/identify', { probe: plantillas[`${f}_1`], threshold: UMBRAL, candidates: dedos.filter((g) => g !== f).map((g) => ({ id: g, template: plantillas[`${g}_1`] })) });
    impostores.push(...r.results.map((x) => ({ par: `${f}_1 vs ${x.id}_1`, puntaje: x.score })));
  }
  const pct = (a, b) => ((100 * a) / b).toFixed(1);
  const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const sobre = genuinos.filter((g) => g.puntaje >= UMBRAL).length;
  const falsos = impostores.filter((g) => g.puntaje >= UMBRAL).length;
  const porDb = Object.fromEntries(Object.keys(DPI).map((db) => {
    const g = genuinos.filter((x) => x.db === db);
    return [db, { dpi: DPI[db], sobreUmbral: g.filter((x) => x.puntaje >= UMBRAL).length, total: g.length, porcentaje: Number(pct(g.filter((x) => x.puntaje >= UMBRAL).length, g.length)) }];
  }));
  const informe = {
    fecha: new Date().toISOString(),
    umbral: UMBRAL,
    imagenes: Object.keys(plantillas).length,
    minucias: { min: Math.min(...minucias), mediana: mediana(minucias), max: Math.max(...minucias) },
    genuinos: { pares: genuinos.length, sobreUmbral: sobre, porcentaje: Number(pct(sobre, genuinos.length)), mediana: mediana(genuinos.map((g) => g.puntaje)), minimo: Math.min(...genuinos.map((g) => g.puntaje)), porDb },
    impostores: { pares: impostores.length, sobreUmbral: falsos, porcentaje: Number(pct(falsos, impostores.length)), maximo: Math.max(...impostores.map((g) => g.puntaje)), mediana: mediana(impostores.map((g) => g.puntaje)) },
    genuinosBajoUmbral: genuinos.filter((g) => g.puntaje < UMBRAL).sort((a, b) => a.puntaje - b.puntaje),
  };
  writeFileSync(join(RAIZ, 'docs', 'evaluacion-afis.json'), JSON.stringify(informe, null, 2) + '\n');
  console.log(`\nSourceAFIS · FVC2002 sets B (DB1–DB4) · umbral ${UMBRAL}`);
  console.log(`  Imágenes procesadas:     ${informe.imagenes} (minucias: mín ${informe.minucias.min}, mediana ${informe.minucias.mediana}, máx ${informe.minucias.max})`);
  console.log(`  Genuinos (_1 vs _2.._8): ${sobre}/${genuinos.length} sobre el umbral (${informe.genuinos.porcentaje} %), mediana ${informe.genuinos.mediana}`);
  for (const [db, x] of Object.entries(porDb)) console.log(`     ${db} (${x.dpi} DPI): ${x.sobreUmbral}/${x.total} (${x.porcentaje} %)`);
  console.log(`  Impostores (_1 vs _1):   ${falsos}/${impostores.length} sobre el umbral, puntaje máximo ${informe.impostores.maximo}`);
  console.log(`  Informe completo: docs/evaluacion-afis.json`);
  const ok = informe.genuinos.porcentaje >= 75 && falsos === 0;
  console.log(ok ? '\n✓ El motor separa genuinos de impostores con el umbral configurado.' : '\n✗ Resultado fuera de lo esperado.');
  process.exitCode = ok ? 0 : 1;
} finally {
  detener();
}
