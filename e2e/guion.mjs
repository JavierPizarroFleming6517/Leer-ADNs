// npm run test:e2e · Recorrido end-to-end con Playwright que sigue el guion del video (README, sección "Guion").
// Requiere la app corriendo (npm run dev). Restablece la demo al empezar (usa --sin-reset para omitirlo).
// Deja una captura de cada pantalla en docs/capturas/.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';
import { RAIZ, leerEnv } from '../scripts/comun.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SALIDA = join(RAIZ, 'docs', 'capturas');
const DEMO = join(RAIZ, 'examples', 'demo');
const PASSWORD = leerEnv().DEMO_PASSWORD;
mkdirSync(SALIDA, { recursive: true });

let n = 0;
const pasos = [];
async function captura(p, nombre, completa = false) {
  n += 1;
  const archivo = `${String(n).padStart(2, '0')}_${nombre}.jpg`;
  await p.waitForTimeout(450);
  await p.screenshot({ path: join(SALIDA, archivo), fullPage: completa, type: 'jpeg', quality: 86 });
  pasos.push(archivo);
  console.log(`  📸 ${archivo}`);
}
function paso(t) {
  console.log(`\n▸ ${t}`);
}

async function salud() {
  try {
    const r = await fetch(`${BASE}/api/salud`);
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

const s = await salud();
if (!s?.db || !s?.afis) {
  console.error(`✗ La app no está lista en ${BASE} (API, base de datos y motor biométrico). Ejecuta "npm run dev" en otra terminal.`);
  process.exit(1);
}
if (!process.argv.includes('--sin-reset')) {
  paso('Restableciendo la demo');
  execSync('node scripts/reset.mjs', { cwd: RAIZ, stdio: 'ignore' });
}
const asignacion = JSON.parse(readFileSync(join(RAIZ, 'datasets', 'asignacion.json'), 'utf8'));

const navegador = await chromium.launch();
const escritorio = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'es-CL' };

async function sesion(email, opciones = escritorio) {
  const ctx = await navegador.newContext(opciones);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('  ! Error de página:', e.message));
  await p.goto(`${BASE}/login`);
  await p.getByTestId('usuarios-demo').locator('button', { hasText: email.startsWith('admin') ? 'Camila' : email.startsWith('operador') ? 'Diego' : email.startsWith('lab') ? 'Valentina' : 'Andrés' }).click();
  await p.fill('#password', PASSWORD);
  await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/login'));
  return p;
}
const tab = (p, id) => p.getByTestId(`tab-${id}`).click();

try {
  // ---------------------------------------------------------------- 1
  paso('1. Login como Admin → Inicio con alerta de huella duplicada');
  const anon = await (await navegador.newContext(escritorio)).newPage();
  await anon.goto(`${BASE}/login`);
  await anon.getByTestId('usuarios-demo').waitFor();
  await captura(anon, 'login');
  const admin = await sesion('admin@trazagen.cl');
  await admin.getByText('Posible huella duplicada').first().waitFor();
  await captura(admin, 'inicio_admin_alerta_duplicado', true);

  // ---------------------------------------------------------------- 2
  paso('2. Crear un lote de 5 stickers → imprimir etiquetas QR');
  await admin.goto(`${BASE}/stickers`);
  await admin.getByTestId('crear-lote').click();
  await admin.getByTestId('lote-plantilla').selectOption({ label: 'Internacional — 5 dedos (mano derecha)' });
  await admin.getByTestId('lote-cantidad').fill('5');
  await captura(admin, 'crear_lote');
  await admin.getByTestId('lote-generar').click();
  await admin.waitForURL(/\/lotes\/.+\/etiquetas/);
  await admin.getByTestId('etiqueta').nth(4).locator('img').waitFor();
  await captura(admin, 'etiquetas_qr_imprimibles');
  const urlQr = await admin.getByTestId('etiqueta').first().getAttribute('data-url');
  const codigoNuevo = urlQr.match(/TG-[0-9A-Z]{4}-[0-9A-Z]{4}/)[0];
  console.log(`  Sticker nuevo: ${codigoNuevo}`);

  // ---------------------------------------------------------------- 3
  paso('3. Operador: escanear → asociar persona → consentimiento → toma → huellas → duplicado');
  const op = await sesion('operador@trazagen.cl');
  await op.goto(`${BASE}/verificacion?modo=qr`);
  await op.getByTestId('codigo-manual').fill(urlQr);
  await captura(op, 'escanear_qr');
  await op.getByRole('button', { name: 'Verificar' }).click();
  await op.getByRole('link', { name: 'Ver expediente' }).click();
  await op.getByText('QR auténtico: firma Ed25519 verificada').waitFor();
  await captura(op, 'ficha_sticker_nuevo_qr_verificado');
  await op.getByTestId('iniciar-toma').click();
  const f = op.getByTestId('form-persona');
  await f.locator('[name=nombres]').fill('Martina');
  await f.locator('[name=apellidos]').fill('Olivares Reyes');
  await f.locator('[name=tipoDocumento]').selectOption('PASAPORTE');
  await f.locator('[name=numeroDocumento]').fill('F7734120');
  await f.locator('[name=pais]').fill('Chile');
  await f.locator('[name=nacionalidad]').fill('Chilena');
  await f.locator('[name=fechaNacimiento]').fill('1996-06-18');
  await f.locator('[name=sexoDeclarado]').selectOption('Femenino');
  await f.locator('[name=institucion]').fill('Universidad de Chile');
  await captura(op, 'asociar_persona');
  await op.getByTestId('guardar-persona').click();
  await op.getByText('Datos sensibles cifrados').waitFor();
  await op.getByTestId('subir-consentimiento').setInputFiles(join(DEMO, 'consentimiento_firmado.pdf'));
  await op.getByText('Consentimiento guardado').waitFor();
  await captura(op, 'persona_y_consentimiento');
  await tab(op, 'toma');
  await op.getByTestId('guardar-toma').click();
  await op.getByText('Registrada').waitFor();
  await captura(op, 'toma_registrada');
  await tab(op, 'huellas');
  await op.getByTestId('input-dedo-2').setInputFiles(join(DEMO, 'toma', 'dedo_nuevo_indice_derecho.png'));
  await op.getByText('sin duplicados').waitFor({ timeout: 30000 });
  await op.getByTestId('detalle-huella').locator('img').waitFor();
  await captura(op, 'huella_cargada_minucias');
  await op.getByTestId('input-dedo-3').setInputFiles(join(DEMO, 'toma', 'dedo_repetido.png'));
  await op.getByText('coincide con una huella de otro sticker').waitFor({ timeout: 30000 });
  await captura(op, 'alerta_huella_duplicada');

  // ---------------------------------------------------------------- 4
  paso('4. Laboratorio: etapas → perfil de otra muestra (rechazado) → perfil correcto (aceptado)');
  const lab = await sesion('laboratorio@genlab.cl');
  const muestraLab = asignacion.stickers.enLaboratorioGuion.muestra;
  await lab.goto(`${BASE}/laboratorio`);
  await lab.getByTestId('muestra-bandeja').filter({ hasText: muestraLab }).waitFor();
  await captura(lab, 'bandeja_laboratorio');
  await lab.getByTestId('muestra-bandeja').filter({ hasText: muestraLab }).click();
  for (const etapa of ['AMPLIFICACION', 'ELECTROFORESIS', 'INTERPRETACION']) {
    await lab.getByTestId(`form-etapa-${etapa}`).waitFor();
    if (etapa === 'AMPLIFICACION') await captura(lab, 'registrar_etapa_amplificacion');
    await lab.getByTestId(`form-etapa-${etapa}`).getByTestId('registrar-etapa').click();
  }
  await lab.getByText('Etapas completas').waitFor();
  await captura(lab, 'etapas_laboratorio_completas', true);
  await tab(lab, 'perfil');
  await lab.getByTestId('subir-perfil').setInputFiles(join(DEMO, 'perfil_otra_muestra.xml'));
  await lab.getByTestId('perfil-rechazado').waitFor();
  await lab.getByText('El archivo corresponde a otra muestra').waitFor();
  await captura(lab, 'perfil_rechazado_otra_muestra');
  await lab.getByTestId('subir-perfil').setInputFiles(join(DEMO, 'perfil_sticker_en_lab.xml'));
  await lab.getByTestId('perfil-aceptado').waitFor();
  await lab.getByText('Sin coincidencias en el registro').waitFor();
  await lab.getByText('20/20 CODIS').first().waitFor();
  await captura(lab, 'perfil_aceptado_20_de_20', true);

  // ---------------------------------------------------------------- 5
  paso('5. Firmar vínculo → Verificar integridad ✓ → Verificar cadena ✓');
  await tab(lab, 'vinculo');
  await lab.getByTestId('firmar-vinculo').click();
  await lab.getByTestId('verificar-integridad').click();
  await lab.getByTestId('integridad-ok').waitFor();
  await captura(lab, 'vinculo_firmado_integridad_ok', true);
  await tab(lab, 'custodia');
  await lab.getByTestId('verificar-cadena').click();
  await lab.getByTestId('cadena-ok').waitFor();
  await captura(lab, 'custodia_cadena_integra', true);

  // ---------------------------------------------------------------- 6
  paso('6. Verificación por huella (coincide y sin coincidencias) y por perfil');
  const ver = await sesion('verificador@trazagen.cl');
  await ver.goto(`${BASE}/verificacion`);
  await ver.getByTestId('subir-huella-verificar').setInputFiles(join(DEMO, 'huella_para_verificar.png'));
  await ver.getByTestId('resultado-coincide').waitFor({ timeout: 30000 });
  const esperado = asignacion.archivosDemo['huella_para_verificar.png'].dueño.persona;
  await ver.getByText(`Coincide con ${esperado}`).waitFor();
  await captura(ver, 'verificacion_huella_coincide', true);
  await ver.getByTestId('subir-huella-verificar').setInputFiles(join(DEMO, 'huella_desconocida.png'));
  await ver.getByTestId('resultado-sin-coincidencias').waitFor({ timeout: 30000 });
  await captura(ver, 'verificacion_huella_sin_coincidencias', true);
  await ver.getByTestId('modo-perfil').click();
  await ver.getByTestId('subir-perfil-verificar').setInputFiles(join(DEMO, 'perfil_persona_registrada.xml'));
  await ver.getByTestId('perfil-coincide').waitFor();
  await captura(ver, 'verificacion_perfil_coincide');

  // ---------------------------------------------------------------- 7
  paso('7. npm run demo:alterar → Verificar integridad ✗');
  const salida = execSync('npm run -s demo:alterar', { cwd: RAIZ, encoding: 'utf8' });
  const alterado = salida.match(/Sticker:\s+(TG-[0-9A-Z-]+)/)[1];
  console.log(`  Alterado directamente en la base: ${alterado}`);
  await admin.goto(`${BASE}/stickers/${alterado}/vinculo`);
  await admin.getByTestId('verificar-integridad').click();
  await admin.getByTestId('integridad-falla').waitFor();
  await admin.getByText('Locus D8S1179').waitFor();
  await captura(admin, 'vinculo_alterado_integridad_falla', true);
  await admin.goto(`${BASE}/`);
  await admin.getByText('Vínculo con integridad alterada').waitFor();
  await captura(admin, 'inicio_alerta_vinculo_alterado');

  // ---------------------------------------------------------------- 8
  paso('8. Escanear desde el celular el QR de una persona registrada → expediente según rol');
  const codigoRegistrado = asignacion.archivosDemo['perfil_persona_registrada.xml'].sticker;
  const tok = await (await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'verificador@trazagen.cl', password: PASSWORD }) })).json();
  const ficha = await (await fetch(`${BASE}/api/stickers/${codigoRegistrado}`, { headers: { Authorization: `Bearer ${tok.accessToken}` } })).json();
  const ruta = new URL(ficha.qrUrl).pathname;
  const movil = await sesion('verificador@trazagen.cl', { ...devices['iPhone 13'], locale: 'es-CL' });
  await movil.goto(`${BASE}${ruta}`);
  await movil.getByText('QR auténtico: firma Ed25519 verificada').waitFor();
  await captura(movil, 'celular_expediente_verificador');
  await movil.goto(`${BASE}/stickers/${codigoRegistrado}/perfil`);
  await movil.getByText('Tu rol ve el resumen del perfil, no los alelos').waitFor();
  await captura(movil, 'celular_perfil_sin_alelos', true);
  await movil.goto(`${BASE}/s/${codigoRegistrado}.${'A'.repeat(86)}`);
  await movil.getByTestId('qr-falso').waitFor();
  await captura(movil, 'celular_qr_falso');

  // ---------------------------------------------------------------- Pantallas de apoyo
  paso('Pantallas de apoyo');
  for (const [r, nombre] of [
    ['/stickers', 'stickers'],
    ['/personas', 'personas'],
    ['/custodia', 'custodia_global'],
    ['/auditoria', 'auditoria'],
    ['/admin', 'administracion'],
  ]) {
    await admin.goto(`${BASE}${r}`);
    await admin.waitForLoadState('networkidle');
    await captura(admin, nombre);
  }
  const labMovil = await sesion('laboratorio@genlab.cl', { ...devices['iPhone 13'], locale: 'es-CL' });
  await labMovil.goto(`${BASE}/stickers/${codigoRegistrado}/persona`);
  await labMovil.getByText('Oculto para tu rol').waitFor();
  await captura(labMovil, 'celular_laboratorio_documento_oculto');

  console.log(`\n✓ Guion completo: ${pasos.length} capturas en docs/capturas/`);
} catch (e) {
  console.error('\n✗ El recorrido falló:', e.message);
  process.exitCode = 1;
} finally {
  await navegador.close();
}
