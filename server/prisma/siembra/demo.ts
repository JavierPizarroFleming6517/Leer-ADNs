// Siembra de demostración realista. Todo pasa por los servicios de la API:
// cifrado AES-256-GCM, índice ciego, custodia con cadena de hashes, extracción y búsqueda 1:N en SourceAFIS,
// validación de perfiles y firmas Ed25519 reales. Las huellas son imágenes de la base pública FVC2002.
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Rol } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AfisService } from '../../src/afis/afis.service';
import { AppModule } from '../../src/app.module';
import { Ctx } from '../../src/common/sesion';
import { CriptoService } from '../../src/cripto/cripto.service';
import { HuellasService } from '../../src/huellas/huellas.service';
import { LaboratorioService } from '../../src/laboratorio/laboratorio.service';
import { PersonasService } from '../../src/personas/personas.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StickersService } from '../../src/stickers/stickers.service';
import { VerificacionService } from '../../src/verificacion/verificacion.controller';
import { VinculosService } from '../../src/vinculos/vinculos.service';
import { construirCmf, pdfSimple, perfilGlobalFiler } from './cmf';

const RAIZ = join(__dirname, '..', '..', '..');
const FVC = join(RAIZ, 'datasets', 'fvc2002');
const DEMO = join(RAIZ, 'examples', 'demo');
const DPI: Record<string, number> = { DB1_B: 500, DB2_B: 569, DB3_B: 500, DB4_B: 500 };

type Dedo = { db: string; dedo: number };
const ruta = (d: Dedo, imp: number) => join(FVC, d.db, `${d.dedo}_${imp}.tif`);
const rel = (d: Dedo, imp: number) => `datasets/fvc2002/${d.db}/${d.dedo}_${imp}.tif`;
const id = (d: Dedo) => `${d.db}/${d.dedo}`;

// ---------------------------------------------------------------- Reparto de los 40 dedos de FVC2002 (DB1–DB4, sets B)
const DESCONOCIDO: Dedo = { db: 'DB4_B', dedo: 103 }; // nunca se registra: huella_desconocida.png
const RESERVA_LAB: Dedo[] = [
  { db: 'DB1_B', dedo: 105 },
  { db: 'DB1_B', dedo: 109 },
]; // sticker en laboratorio del guion
const RESERVA_TOMA: Dedo = { db: 'DB1_B', dedo: 107 }; // la carga en vivo el operador en el video
const VERIFICAR: Dedo = { db: 'DB1_B', dedo: 106 }; // su impresión _5 es huella_para_verificar.png
const DUPLICADO_SEMBRADO: Dedo = { db: 'DB2_B', dedo: 101 }; // su impresión _2 se carga a otra persona
const DUPLICADO_TOMA: Dedo = { db: 'DB1_B', dedo: 108 }; // su impresión _3 es dedo_repetido.png

const reservados = new Set([DESCONOCIDO, ...RESERVA_LAB, RESERVA_TOMA].map(id));
const PARA_PERSONAS: Dedo[] = [];
for (const db of ['DB1_B', 'DB2_B', 'DB3_B', 'DB4_B']) {
  for (let d = 101; d <= 110; d++) if (!reservados.has(`${db}/${d}`)) PARA_PERSONAS.push({ db, dedo: d });
}

type PersonaDemo = {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  pais: string;
  nacionalidad: string;
  fechaNacimiento: string;
  sexoDeclarado: string;
  institucion: string;
  sexo: 'F' | 'M';
  lugar: string;
  noObtenible?: { posicion: number; motivo: string };
};

const PERSONAS: PersonaDemo[] = [
  { nombres: 'Valeria Andrea', apellidos: 'Contreras Ibáñez', tipoDocumento: 'RUN', numeroDocumento: '31.482.937-6', pais: 'Chile', nacionalidad: 'Chilena', fechaNacimiento: '1990-03-14', sexoDeclarado: 'Femenino', institucion: 'Hospital del Salvador', sexo: 'F', lugar: 'Centro de Toma TrazaGen · Providencia, Santiago' },
  { nombres: 'Matías Ignacio', apellidos: 'Herrera Lagos', tipoDocumento: 'RUN', numeroDocumento: '32.105.664-K', pais: 'Chile', nacionalidad: 'Chilena', fechaNacimiento: '1985-11-02', sexoDeclarado: 'Masculino', institucion: 'Minera Altiplano S.A.', sexo: 'M', lugar: 'Faena Minera Altiplano · Calama' },
  { nombres: 'Lucía Belén', apellidos: 'Fernández Ortiz', tipoDocumento: 'DNI', numeroDocumento: '95.204.118', pais: 'Argentina', nacionalidad: 'Argentina', fechaNacimiento: '1993-07-21', sexoDeclarado: 'Femenino', institucion: 'Consulado de Argentina en Santiago', sexo: 'F', lugar: 'Centro de Toma TrazaGen · Providencia, Santiago' },
  { nombres: 'Sebastián', apellidos: 'Rojas Alarcón', tipoDocumento: 'DNI', numeroDocumento: '48120937', pais: 'Perú', nacionalidad: 'Peruana', fechaNacimiento: '1979-05-09', sexoDeclarado: 'Masculino', institucion: 'Naviera del Pacífico', sexo: 'M', lugar: 'Terminal Portuario · Valparaíso' },
  { nombres: 'Camila Andrea', apellidos: 'Vargas Peña', tipoDocumento: 'CEDULA', numeroDocumento: '1.020.457.381', pais: 'Colombia', nacionalidad: 'Colombiana', fechaNacimiento: '1998-01-30', sexoDeclarado: 'Femenino', institucion: 'Universidad de Chile', sexo: 'F', lugar: 'Centro de Toma TrazaGen · Providencia, Santiago', noObtenible: { posicion: 4, motivo: 'Cicatriz extensa en el pulpejo: crestas no legibles' } },
  { nombres: 'Joaquín Andrés', apellidos: 'Medina Salas', tipoDocumento: 'CEDULA', numeroDocumento: '6.948.211', pais: 'Bolivia', nacionalidad: 'Boliviana', fechaNacimiento: '1988-09-17', sexoDeclarado: 'Masculino', institucion: 'Minera Altiplano S.A.', sexo: 'M', lugar: 'Faena Minera Altiplano · Calama', noObtenible: { posicion: 2, motivo: 'Amputación traumática de falange distal' } },
  { nombres: 'Fernanda', apellidos: 'Castillo Ruiz', tipoDocumento: 'PASAPORTE', numeroDocumento: 'G48120394', pais: 'México', nacionalidad: 'Mexicana', fechaNacimiento: '1995-12-03', sexoDeclarado: 'Femenino', institucion: 'Embajada de México', sexo: 'F', lugar: 'Centro de Toma TrazaGen · Providencia, Santiago', noObtenible: { posicion: 3, motivo: 'Vendaje por herida reciente; no se pudo entintar' } },
  { nombres: 'Tomás Eduardo', apellidos: 'Aguilera Muñoz', tipoDocumento: 'RUN', numeroDocumento: '30.917.452-3', pais: 'Chile', nacionalidad: 'Chilena', fechaNacimiento: '1972-04-26', sexoDeclarado: 'Masculino', institucion: 'Naviera del Pacífico', sexo: 'M', lugar: 'Terminal Portuario · Valparaíso', noObtenible: { posicion: 5, motivo: 'Dermatitis de contacto: grafito insuficiente en la casilla' } },
];

const LAB_A: PersonaDemo = { nombres: 'Isidora', apellidos: 'Navarro Pizarro', tipoDocumento: 'RUN', numeroDocumento: '33.204.118-1', pais: 'Chile', nacionalidad: 'Chilena', fechaNacimiento: '2001-08-11', sexoDeclarado: 'Femenino', institucion: 'Universidad de Chile', sexo: 'F', lugar: 'Centro de Toma TrazaGen · Providencia, Santiago' };
const LAB_B: PersonaDemo = { nombres: 'Rodrigo Alonso', apellidos: 'Saavedra Molina', tipoDocumento: 'RUN', numeroDocumento: '29.884.310-7', pais: 'Chile', nacionalidad: 'Chilena', fechaNacimiento: '1983-02-19', sexoDeclarado: 'Masculino', institucion: 'Naviera del Pacífico', sexo: 'M', lugar: 'Terminal Portuario · Valparaíso' };

const DEDOS: Record<number, string> = { 1: 'Pulgar derecho', 2: 'Índice derecho', 3: 'Medio derecho', 4: 'Anular derecho', 5: 'Meñique derecho' };
const LAB = 'GenLab Santiago · Laboratorio de Genética Forense';

const DIA = 86_400_000;
const hora = (h: number) => h * 3_600_000;

type Usuarios = Record<string, { id: string; nombre: string; email: string; rol: Rol }>;

export async function sembrarDemo(base: { usuarios: Usuarios; plantillas: Record<string, string> }) {
  for (const d of [DESCONOCIDO, ...RESERVA_LAB, RESERVA_TOMA, ...PARA_PERSONAS]) {
    if (!existsSync(ruta(d, 1))) throw new Error(`Falta ${rel(d, 1)}. Copia la base FVC2002 en datasets/fvc2002 (sets DB1_B a DB4_B).`);
  }
  const app: INestApplicationContext = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    await sembrar(app, base);
  } finally {
    await app.close();
  }
}

async function sembrar(app: INestApplicationContext, base: { usuarios: Usuarios; plantillas: Record<string, string> }) {
  const prisma = app.get(PrismaService);
  const afis = app.get(AfisService);
  const stickers = app.get(StickersService);
  const personas = app.get(PersonasService);
  const huellas = app.get(HuellasService);
  const lab = app.get(LaboratorioService);
  const vinculos = app.get(VinculosService);
  const verificacion = app.get(VerificacionService);

  if (await prisma.lote.count()) {
    console.log('La base ya tiene datos de demostración. Usa "npm run demo:reset" para empezar de cero.');
    return;
  }
  if (!(await afis.salud()).ok) throw new Error('El motor biométrico (afis) no responde. La siembra necesita SourceAFIS para extraer y comparar huellas.');

  const U = base.usuarios;
  const ahora = Date.now();
  const ctx = (u: string, t: number): Ctx => ({ usuario: U[u], ip: '10.20.0.15', fecha: new Date(t) });

  // ------------------------------------------------------------ Lotes (40 stickers)
  const plantilla5 = base.plantillas['Internacional'];
  const plantilla10 = base.plantillas['Chile'];
  const lote1 = await stickers.crearLote({ plantillaId: plantilla5, cantidad: 20, fechaFabricacion: new Date(ahora - 80 * DIA).toISOString().slice(0, 10), versionDiseno: '2.0', fabrica: 'Adhesivos Médicos del Pacífico S.A. · Planta Quilicura' }, ctx('admin', ahora - 78 * DIA));
  await stickers.crearLote({ plantillaId: plantilla10, cantidad: 10, fechaFabricacion: new Date(ahora - 45 * DIA).toISOString().slice(0, 10), versionDiseno: '2.1', fabrica: 'Adhesivos Médicos del Pacífico S.A. · Planta Quilicura' }, ctx('admin', ahora - 44 * DIA));
  await stickers.crearLote({ plantillaId: plantilla5, cantidad: 10, fechaFabricacion: new Date(ahora - 12 * DIA).toISOString().slice(0, 10), versionDiseno: '2.1', fabrica: 'Adhesivos Médicos del Pacífico S.A. · Planta Quilicura' }, ctx('admin', ahora - 11 * DIA));
  console.log('✓ 3 lotes, 40 stickers con QR firmado y evento de fabricación.');
  const codigos = lote1.stickers.map((s) => s.codigo);

  const asignacion: Record<string, unknown>[] = [];
  const perfiles: Record<string, Record<string, string[]>> = {};
  const resultadosHuellas: { sticker: string; posicion: number; archivo: string; minucias: number; duplicados: unknown[] }[] = [];

  async function tomar(codigo: string, p: PersonaDemo, t0: number, dedos: { posicion: number; dedo: Dedo; impresion: number }[], noObt: { posicion: number; motivo: string }[]) {
    const { sexo: _s, lugar, noObtenible: _n, ...datos } = p;
    const persona = await personas.asociar(codigo, { nueva: datos }, ctx('operador', t0));
    const pdf = pdfSimple('Consentimiento informado · TrazaGen', [
      'Versión 3.2 del texto aprobado por el Comité Ético Científico.',
      '',
      `Yo, ${p.nombres} ${p.apellidos}, autorizo la toma de mis huellas dactilares y de una`,
      'muestra de células epiteliales mediante el sticker TrazaGen, con el fin de generar',
      'mi identificación dactilogenética. Entiendo que mis datos personales se guardan',
      'cifrados y separados de los datos biométricos y genéticos.',
      '',
      `Código del sticker: ${codigo}`,
      `Fecha: ${new Date(t0).toISOString().slice(0, 10)}`,
      '',
      'Documento ficticio generado para la demostración de TrazaGen.',
    ]);
    await personas.consentimiento(codigo, { versionTexto: '3.2', fechaFirma: new Date(t0).toISOString(), entidadRevisora: 'Comité Ético Científico · Servicio de Salud Metropolitano Oriente' }, { nombre: `consentimiento_${codigo}.pdf`, datos: pdf }, ctx('operador', t0 + 5 * 60_000));
    await personas.toma(codigo, { fechaHora: new Date(t0 + 8 * 60_000).toISOString(), lugar, observaciones: 'Toma con grafito sobre el sticker; huellas digitalizadas con escáner de cama plana.', dedosNoObtenibles: noObt }, ctx('operador', t0 + 10 * 60_000));
    let t = t0 + 15 * 60_000;
    for (const d of dedos) {
      const r = await huellas.subir(codigo, { posicion: d.posicion, origen: 'ESCANER', dpi: DPI[d.dedo.db], nombre: `${d.dedo.dedo}_${d.impresion}.tif`, datos: readFileSync(ruta(d.dedo, d.impresion)) }, ctx('operador', (t += 60_000)));
      resultadosHuellas.push({ sticker: codigo, posicion: d.posicion, archivo: rel(d.dedo, d.impresion), minucias: r.huella.cantidadMinucias, duplicados: r.control.duplicados });
    }
    await personas.envio(codigo, { destino: LAB, transportista: 'Courier clínico con cadena de frío', sello: `SB-${String(100000 + Math.floor((t0 / 1000) % 899999)).slice(0, 6)}` }, ctx('operador', t0 + hora(3)));
    return persona;
  }

  const qpcr = (codigoMuestra: string, adn: number) =>
    Buffer.from(['Well,Sample Name,Target,Cq,Quantity (ng/uL)', `A1,${codigoMuestra},Small Autosomal,27.41,${(adn * 1000).toFixed(2)}`, `A2,${codigoMuestra},Large Autosomal,28.96,${(adn * 820).toFixed(2)}`, `A3,${codigoMuestra},Y,${adn > 0 ? '29.88' : 'Undetermined'},${(adn * 450).toFixed(2)}`, 'A4,NTC,Small Autosomal,Undetermined,0'].join('\r\n'), 'utf8');

  async function laboratorio(codigo: string, hasta: string, t0: number, sello: 'INTACTO' | 'DANADO' = 'INTACTO') {
    const m = await lab.recepcion(codigo, { laboratorio: LAB, estadoSello: sello, observaciones: sello === 'INTACTO' ? 'Bolsa sellada, sticker en buen estado.' : 'Bolsa con el sello despegado en una esquina; sticker sin daño visible.' }, null, ctx('laboratorio', t0));
    const etapas: [string, Record<string, unknown>, ((cm: string) => { nombre: string; datos: Buffer; mime: string }) | null][] = [
      ['EXTRACCION', { metodo: 'Orgánica (fenol-cloroformo) desde adhesivo', equipos: 'Termobloque Eppendorf · Centrífuga 5424' }, null],
      ['CUANTIFICACION', { adnUgMl: 0.031 + ((t0 / 1000) % 37) / 1000, metodo: 'qPCR · Quantifiler Trio' }, (cm) => ({ nombre: `qpcr_${cm}.csv`, datos: qpcr(cm, 0.04), mime: 'text/csv' })],
      ['AMPLIFICACION', { kit: 'GlobalFiler', loteKit: 'GF-2611-0457', equipos: 'Veriti 96-Well' }, null],
      ['ELECTROFORESIS', { equipos: 'SeqStudio 24 Flex' }, null],
      ['INTERPRETACION', { software: 'GeneMapper ID-X 1.6', analista: 'Dra. Valentina Soto', tubosAlmacenados: 2 }, null],
    ];
    let t = t0;
    if (hasta === 'RECEPCION_LAB') return { muestra: m.codigo, t };
    for (const [etapa, datos, archivo] of etapas) {
      t += DIA * (0.6 + ((t / 1000) % 5) / 10);
      await lab.etapa(codigo, { etapa: etapa as never, ...datos }, archivo ? archivo(m.codigo) : null, ctx('laboratorio', t));
      if (etapa === hasta) break;
    }
    return { muestra: m.codigo, t };
  }

  // ------------------------------------------------------------ 8 personas completas
  let k = 0;
  for (let i = 0; i < PERSONAS.length; i++) {
    const p = PERSONAS[i];
    const codigo = codigos[i];
    const t0 = ahora - (62 - i * 6) * DIA + hora(9 + (i % 4));
    const dedos: { posicion: number; dedo: Dedo; impresion: number }[] = [];
    for (let pos = 1; pos <= 5; pos++) {
      if (p.noObtenible?.posicion === pos) continue;
      dedos.push({ posicion: pos, dedo: PARA_PERSONAS[k++], impresion: 1 });
    }
    await tomar(codigo, p, t0, dedos, p.noObtenible ? [p.noObtenible] : []);
    const { muestra, t } = await laboratorio(codigo, 'INTERPRETACION', t0 + DIA);
    const marcadores = perfilGlobalFiler(i + 1, p.sexo);
    perfiles[codigo] = marcadores;
    const xml = construirCmf([{ id: muestra, marcadores }], new Date(t + hora(2)));
    await lab.cargarPerfil(codigo, { nombre: `GlobalFiler_${muestra}.xml`, datos: Buffer.from(xml, 'utf8'), mime: 'application/xml' }, undefined, ctx('laboratorio', t + hora(3)));
    await vinculos.firmar(codigo, ctx('laboratorio', t + hora(5)));
    if (i < 2) await lab.finalizar(codigo, 'Se agotó el material del adhesivo en la re-extracción.', ctx('laboratorio', t + 4 * DIA));
    for (const d of dedos) {
      asignacion.push({ persona: `${p.nombres} ${p.apellidos}`, sticker: codigo, posicion: d.posicion, dedo: DEDOS[d.posicion], archivo: rel(d.dedo, 1), dpi: DPI[d.dedo.db] });
    }
    if (p.noObtenible) asignacion.push({ persona: `${p.nombres} ${p.apellidos}`, sticker: codigo, posicion: p.noObtenible.posicion, dedo: DEDOS[p.noObtenible.posicion], archivo: null, noObtenible: p.noObtenible.motivo });
    process.stdout.write(`  · ${codigo} ${p.nombres} ${p.apellidos}: ${dedos.length} huellas, muestra ${muestra}, vínculo firmado\n`);
  }
  console.log('✓ 8 personas completas con huellas, perfil GlobalFiler, custodia y vínculo firmado.');

  // ------------------------------------------------------------ Sticker en laboratorio del guion (extracción y cuantificación hechas)
  const codigoLabA = codigos[8];
  const tA = ahora - 4 * DIA + hora(10);
  await tomar(codigoLabA, LAB_A, tA, [
    { posicion: 1, dedo: RESERVA_LAB[0], impresion: 1 },
    { posicion: 2, dedo: RESERVA_LAB[1], impresion: 1 },
  ], [
    { posicion: 3, motivo: 'Crestas ilegibles: grafito insuficiente en la casilla' },
    { posicion: 4, motivo: 'Crestas ilegibles: grafito insuficiente en la casilla' },
    { posicion: 5, motivo: 'Crestas ilegibles: grafito insuficiente en la casilla' },
  ]);
  const labA = await laboratorio(codigoLabA, 'CUANTIFICACION', tA + DIA);
  RESERVA_LAB.forEach((d, j) => asignacion.push({ persona: `${LAB_A.nombres} ${LAB_A.apellidos}`, sticker: codigoLabA, posicion: j + 1, dedo: DEDOS[j + 1], archivo: rel(d, 1), dpi: DPI[d.db], nota: 'Sticker en laboratorio (guion, paso 4)' }));

  // ------------------------------------------------------------ Caso de duplicado: otra persona con la impresión _2 de un dedo ya registrado
  const codigoLabB = codigos[9];
  const tB = ahora - 2 * DIA + hora(15);
  await tomar(codigoLabB, LAB_B, tB, [{ posicion: 2, dedo: DUPLICADO_SEMBRADO, impresion: 2 }], []);
  const labB = await laboratorio(codigoLabB, 'RECEPCION_LAB', tB + hora(20), 'DANADO');
  const dueñoDuplicado = asignacion.find((a) => a.archivo === rel(DUPLICADO_SEMBRADO, 1));
  asignacion.push({ persona: `${LAB_B.nombres} ${LAB_B.apellidos}`, sticker: codigoLabB, posicion: 2, dedo: DEDOS[2], archivo: rel(DUPLICADO_SEMBRADO, 2), dpi: DPI[DUPLICADO_SEMBRADO.db], nota: `Duplicado sembrado: misma huella que ${dueñoDuplicado?.persona} (${dueñoDuplicado?.dedo}, ${dueñoDuplicado?.sticker})` });
  const det = resultadosHuellas.find((r) => r.sticker === codigoLabB);
  console.log(`✓ Duplicado detectado por SourceAFIS al sembrar: ${JSON.stringify(det?.duplicados.map((d) => ({ sticker: (d as { stickerCodigo: string }).stickerCodigo, puntaje: (d as { puntaje: number }).puntaje })))}`);
  if (!det?.duplicados.length) console.warn('  ! SourceAFIS no detectó el duplicado sembrado.');

  // ------------------------------------------------------------ Actividad de verificación del mes
  const mes = new Date();
  mes.setDate(1);
  mes.setHours(9, 0, 0, 0);
  const tv = Math.max(mes.getTime() + hora(2), ahora - 3 * DIA);
  const otra = PARA_PERSONAS[3];
  await verificacion.porHuella(`${otra.dedo}_6.tif`, readFileSync(ruta(otra, 6)), DPI[otra.db], ctx('verificador', tv));
  const perfilConsulta = perfiles[codigos[4]];
  await verificacion.porPerfil('consulta_frontera.xml', Buffer.from(construirCmf([{ id: 'CONSULTA-2026-0871', marcadores: perfilConsulta }]), 'utf8'), ctx('verificador', tv + hora(2)));
  await vinculos.verificar(codigos[0], ctx('verificador', tv + hora(3)));
  // Intentos de QR falso: firma alterada y código inexistente.
  const url = app.get(CriptoService).urlQr(codigos[2]);
  await stickers.resolverQr(url.slice(0, -6) + 'AAAAAA', ctx('verificador', ahora - DIA));
  await stickers.resolverQr(`${url.split('/s/')[0]}/s/TG-7Q2M-K9XD.${'x'.repeat(86)}`, ctx('operador', ahora - hora(6)));
  console.log('✓ Verificaciones del mes e intentos de QR falso registrados en auditoría.');

  // ------------------------------------------------------------ Archivos para el video (examples/demo)
  mkdirSync(join(DEMO, 'toma'), { recursive: true });
  const png = async (d: Dedo, imp: number) => {
    const e = await afis.extraer(readFileSync(ruta(d, imp)), DPI[d.db]);
    return Buffer.from(e.png!, 'base64');
  };
  writeFileSync(join(DEMO, 'huella_para_verificar.png'), await png(VERIFICAR, 5));
  writeFileSync(join(DEMO, 'huella_desconocida.png'), await png(DESCONOCIDO, 2));
  writeFileSync(join(DEMO, 'toma', 'dedo_nuevo_indice_derecho.png'), await png(RESERVA_TOMA, 1));
  writeFileSync(join(DEMO, 'toma', 'dedo_repetido.png'), await png(DUPLICADO_TOMA, 3));

  const fechaArchivos = new Date('2026-11-02T09:00:00Z'); // fija: los archivos de ejemplo no cambian entre siembras
  const perfilLab = perfilGlobalFiler(101, LAB_A.sexo);
  writeFileSync(join(DEMO, 'perfil_sticker_en_lab.xml'), construirCmf([{ id: labA.muestra, marcadores: perfilLab }], fechaArchivos));
  writeFileSync(join(DEMO, 'perfil_otra_muestra.xml'), construirCmf([{ id: 'M-000431', marcadores: perfilGlobalFiler(202, 'M') }], fechaArchivos));
  const registrada = PERSONAS[4];
  writeFileSync(join(DEMO, 'perfil_persona_registrada.xml'), construirCmf([{ id: 'CONSULTA-2026-0912', marcadores: perfiles[codigos[4]], categoria: 'Query' }], fechaArchivos));
  writeFileSync(
    join(DEMO, 'consentimiento_firmado.pdf'),
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

  const dueñoVerificar = asignacion.find((a) => a.archivo === rel(VERIFICAR, 1));
  const dueñoRepetido = asignacion.find((a) => a.archivo === rel(DUPLICADO_TOMA, 1));
  const resumen = {
    descripcion: 'Reparto de las huellas de FVC2002 (sets B, DB1–DB4) entre las personas de la demo. Lo genera la siembra; no editar a mano.',
    dpi: DPI,
    personas: asignacion,
    sinAsignar: { archivo: `datasets/fvc2002/${DESCONOCIDO.db}/${DESCONOCIDO.dedo}_*.tif`, uso: 'huella_desconocida.png (impresión _2): ningún dedo registrado' },
    reservados: {
      tomaEnVivo: { archivo: rel(RESERVA_TOMA, 1), uso: 'examples/demo/toma/dedo_nuevo_indice_derecho.png: dedo limpio para cargar en el video' },
    },
    archivosDemo: {
      'huella_para_verificar.png': { origen: rel(VERIFICAR, 5), dueño: dueñoVerificar },
      'huella_desconocida.png': { origen: rel(DESCONOCIDO, 2), dueño: null },
      'toma/dedo_nuevo_indice_derecho.png': { origen: rel(RESERVA_TOMA, 1), dueño: null },
      'toma/dedo_repetido.png': { origen: rel(DUPLICADO_TOMA, 3), dueño: dueñoRepetido },
      'perfil_sticker_en_lab.xml': { sticker: codigoLabA, muestra: labA.muestra },
      'perfil_otra_muestra.xml': { specimenId: 'M-000431', esperado: 'rechazo' },
      'perfil_persona_registrada.xml': { coincideCon: `${registrada.nombres} ${registrada.apellidos}`, sticker: codigos[4] },
    },
    stickers: {
      enLaboratorioGuion: { codigo: codigoLabA, muestra: labA.muestra, etapa: 'CUANTIFICACION' },
      duplicado: { codigo: codigoLabB, muestra: labB.muestra, etapa: 'RECEPCION_LAB', sello: 'DANADO' },
      alterable: { codigo: codigos[1], persona: `${PERSONAS[1].nombres} ${PERSONAS[1].apellidos}` },
    },
  };
  writeFileSync(join(RAIZ, 'datasets', 'asignacion.json'), JSON.stringify(resumen, null, 2) + '\n');

  const totalNuevos = await prisma.sticker.count({ where: { estado: 'NUEVO' } });
  console.log(`✓ examples/demo y datasets/asignacion.json actualizados.`);
  console.log(`\n  Sticker en laboratorio para el guion: ${codigoLabA} (muestra ${labA.muestra})`);
  console.log(`  Sticker con huella duplicada:         ${codigoLabB}`);
  console.log(`  huella_para_verificar.png pertenece a ${dueñoVerificar?.persona} (${dueñoVerificar?.dedo}, ${dueñoVerificar?.sticker})`);
  console.log(`  Stickers NUEVO disponibles: ${totalNuevos}`);
}
