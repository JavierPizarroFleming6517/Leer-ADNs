// npm run test:e2e · Recorrido end-to-end con Playwright que sigue el guion del video (README, sección "Guion").
// Requiere la app corriendo (npm run dev). Restablece la demo al empezar (usa --sin-reset para omitirlo).
// Deja una captura de cada pantalla en docs/capturas/.
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';
import { RAIZ, leerEnv } from '../scripts/comun.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const SALIDA = join(RAIZ, 'docs', 'capturas');
const DEMO = join(RAIZ, 'examples', 'demo');
// Códigos fijos de la demo (server/prisma/siembra/codigos.ts).
const EN_VIVO = 'TG-7M4K-2QRT';
const DUPLICADO = 'TG-0ZKT-7HEB';
const PERFIL_REGISTRADO = 'TG-5C8R-7NHQ';
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

const navegador = await chromium.launch();
const escritorio = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'es-CL' };

async function sesion(email, opciones = escritorio) {
  const ctx = await navegador.newContext(opciones);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('  ! Error de página:', e.message));
  await p.goto(`${BASE}/login`);
  await p.getByTestId('usuarios-demo').locator('button', { hasText: 'Camila' }).click();
  if (email) await p.fill('#email', email);
  await p.fill('#password', PASSWORD);
  await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/login'));
  return p;
}
const tab = (p, id) => p.getByTestId(`tab-${id}`).click();

try {
  // ---------------------------------------------------------------- 1
  paso('1. Login → Inicio con alerta de huella duplicada');
  const anon = await (await navegador.newContext(escritorio)).newPage();
  await anon.goto(`${BASE}/login`);
  await anon.getByTestId('usuarios-demo').waitFor();
  await captura(anon, 'login');
  const admin = await sesion('admin@trazagen.cl');
  await admin.getByText('Posible huella duplicada').first().waitFor();
  await admin.getByTestId('esperando-laboratorio').first().waitFor();
  await captura(admin, 'inicio_alertas_y_laboratorio', true);

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
  const urlQrSinUso = await admin.getByTestId('etiqueta').nth(4).getAttribute('data-url');
  const codigoSinUso = urlQrSinUso.match(/TG-[0-9A-Z]{4}-[0-9A-Z]{4}/)[0];
  const tok = await (await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@trazagen.cl', password: PASSWORD }) })).json();
  const qrDe = async (codigo) => (await (await fetch(`${BASE}/api/stickers/${codigo}`, { headers: { Authorization: `Bearer ${tok.accessToken}` } })).json()).qrUrl;
  const urlQr = await qrDe(EN_VIVO);

  // ---------------------------------------------------------------- 3
  paso('3. Verificar QR → asociar persona → consentimiento → toma → huellas → duplicado → envío al laboratorio');
  await admin.goto(`${BASE}/verificacion?modo=qr`);
  await admin.getByTestId('codigo-manual').fill(urlQr);
  await captura(admin, 'verificar_qr');
  await admin.getByRole('button', { name: 'Verificar' }).click();
  await admin.getByRole('link', { name: 'Ver expediente' }).click();
  await admin.getByText('QR auténtico: firma Ed25519 verificada').waitFor();
  await captura(admin, 'ficha_sticker_nuevo_qr_verificado');
  await admin.getByTestId('iniciar-toma').click();
  const f = admin.getByTestId('form-persona');
  await f.locator('[name=nombres]').fill('Martina');
  await f.locator('[name=apellidos]').fill('Olivares Reyes');
  await f.locator('[name=tipoDocumento]').selectOption('PASAPORTE');
  await f.locator('[name=numeroDocumento]').fill('F7734120');
  await f.locator('[name=pais]').fill('Chile');
  await f.locator('[name=nacionalidad]').fill('Chilena');
  await f.locator('[name=fechaNacimiento]').fill('1996-06-18');
  await f.locator('[name=sexoDeclarado]').selectOption('Femenino');
  await f.locator('[name=institucion]').fill('Universidad de Chile');
  await captura(admin, 'asociar_persona');
  await admin.getByTestId('guardar-persona').click();
  await admin.getByText('Datos sensibles cifrados').waitFor();
  await admin.getByTestId('subir-consentimiento').setInputFiles(join(DEMO, 'paso3_toma', 'consentimiento_firmado.pdf'));
  await admin.getByText('Consentimiento guardado').waitFor();
  await captura(admin, 'persona_y_consentimiento');
  await tab(admin, 'toma');
  await admin.getByTestId('guardar-toma').click();
  await admin.getByText('Registrada').waitFor();
  await captura(admin, 'toma_registrada');
  await tab(admin, 'huellas');
  await admin.getByTestId('input-dedo-2').setInputFiles(join(DEMO, 'paso3_toma', 'huella_indice_derecho.png'));
  await admin.getByText('sin duplicados').waitFor({ timeout: 30000 });
  await admin.getByTestId('detalle-huella').locator('img').waitFor();
  await captura(admin, 'huella_cargada_minucias');
  await admin.getByTestId('input-dedo-3').setInputFiles(join(DEMO, 'paso3_toma', 'huella_medio_derecho_repetida.png'));
  await admin.getByText('coincide con una huella de otro sticker').waitFor({ timeout: 30000 });
  await captura(admin, 'alerta_huella_duplicada');
  await tab(admin, 'perfil');
  await admin.getByTestId('form-envio').waitFor();
  await captura(admin, 'envio_al_laboratorio');
  await admin.getByTestId('registrar-envio').click();
  await admin.getByTestId('subir-perfil').waitFor({ state: 'attached' });
  await admin.getByText('Esperando · 0 días').waitFor();
  await captura(admin, 'esperando_resultado_laboratorio');

  // ---------------------------------------------------------------- 4
  paso('4. Resultado del laboratorio externo: archivo de otra muestra (rechazado) → archivo del sticker (aceptado)');
  await admin.getByTestId('subir-perfil').setInputFiles(join(DEMO, 'paso4_laboratorio', '1_resultado_de_otra_muestra.xml'));
  await admin.getByTestId('perfil-rechazado').waitFor();
  await admin.getByText('El archivo corresponde a otra muestra').waitFor();
  await captura(admin, 'perfil_rechazado_otra_muestra');
  await admin.getByTestId('subir-perfil').setInputFiles(join(DEMO, 'paso4_laboratorio', `2_resultado_${EN_VIVO}.xml`));
  await admin.getByTestId('perfil-aceptado').waitFor();
  await admin.getByText('Sin coincidencias en el registro').waitFor();
  await admin.getByText('20/20 CODIS').first().waitFor();
  await captura(admin, 'perfil_aceptado_20_de_20', true);

  // ---------------------------------------------------------------- 5
  paso('5. Firmar vínculo → Verificar integridad ✓ → Verificar cadena ✓');
  await tab(admin, 'vinculo');
  await admin.getByTestId('firmar-vinculo').click();
  await admin.getByTestId('verificar-integridad').click();
  await admin.getByTestId('integridad-ok').waitFor();
  await captura(admin, 'vinculo_firmado_integridad_ok', true);
  await tab(admin, 'custodia');
  await admin.getByTestId('verificar-cadena').click();
  await admin.getByTestId('cadena-ok').waitFor();
  await captura(admin, 'custodia_cadena_integra', true);

  // ---------------------------------------------------------------- 6
  paso('6. Verificación por huella (coincide y sin coincidencias) y por perfil');
  await admin.goto(`${BASE}/verificacion`);
  await admin.getByTestId('subir-huella-verificar').setInputFiles(join(DEMO, 'paso6_verificacion', '1_huella_registrada.png'));
  await admin.getByTestId('resultado-coincide').waitFor({ timeout: 30000 });
  await admin.getByText('Coincide con Valeria Andrea Contreras Ibáñez').waitFor();
  await captura(admin, 'verificacion_huella_coincide', true);
  await admin.getByTestId('subir-huella-verificar').setInputFiles(join(DEMO, 'paso6_verificacion', '2_huella_desconocida.png'));
  await admin.getByTestId('resultado-sin-coincidencias').waitFor({ timeout: 30000 });
  await captura(admin, 'verificacion_huella_sin_coincidencias', true);
  await admin.getByTestId('modo-perfil').click();
  await admin.getByTestId('subir-perfil-verificar').setInputFiles(join(DEMO, 'paso6_verificacion', '3_perfil_registrado.xml'));
  await admin.getByTestId('perfil-coincide').waitFor();
  await captura(admin, 'verificacion_perfil_coincide');

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
  paso('8. Escanear desde el celular el QR de una persona registrada → expediente; QR falso');
  const codigoRegistrado = PERFIL_REGISTRADO;
  const ruta = new URL(await qrDe(codigoRegistrado)).pathname;
  const movil = await sesion('admin@trazagen.cl', { ...devices['iPhone 13'], locale: 'es-CL' });
  await movil.goto(`${BASE}${ruta}`);
  await movil.getByText('QR auténtico: firma Ed25519 verificada').waitFor();
  await captura(movil, 'celular_expediente');
  await movil.goto(`${BASE}/s/${codigoRegistrado}.${'A'.repeat(86)}`);
  await movil.getByTestId('qr-falso').waitFor();
  await captura(movil, 'celular_qr_falso');

  // ---------------------------------------------------------------- 9
  paso('9. Eliminar un sticker sin uso; anular uno con datos (nunca se borra)');
  await admin.goto(`${BASE}/stickers/${codigoSinUso}`);
  await admin.getByTestId('eliminar-sticker').click();
  await captura(admin, 'eliminar_sticker_sin_uso');
  await admin.getByTestId('confirmar-accion').click();
  await admin.waitForURL(/\/stickers$/);
  const codigoDuplicado = DUPLICADO;
  await admin.goto(`${BASE}/stickers/${codigoDuplicado}`);
  await admin.getByTestId('anular-sticker').click();
  await admin.getByTestId('motivo-anulacion').fill('Huella de otra persona cargada por error; se repite la toma');
  await captura(admin, 'anular_sticker_con_datos');
  await admin.getByTestId('confirmar-accion').click();
  await admin.getByText(/Sticker anulado el/).waitFor();
  await tab(admin, 'custodia');
  await admin.getByTestId('verificar-cadena').click();
  await admin.getByTestId('cadena-ok').waitFor();
  await captura(admin, 'sticker_anulado_custodia', true);

  // ---------------------------------------------------------------- Pantallas de apoyo
  paso('Pantallas de apoyo');
  for (const [r, nombre] of [
    ['/stickers', 'stickers'],
    ['/stickers?vista=lotes', 'lotes'],
    ['/personas', 'personas'],
    ['/auditoria', 'auditoria'],
    ['/admin', 'administracion'],
  ]) {
    await admin.goto(`${BASE}${r}`);
    await admin.waitForLoadState('networkidle');
    await captura(admin, nombre);
  }

  console.log(`\n✓ Guion completo: ${pasos.length} capturas en docs/capturas/`);
} catch (e) {
  console.error('\n✗ El recorrido falló:', e.message);
  process.exitCode = 1;
} finally {
  await navegador.close();
}
