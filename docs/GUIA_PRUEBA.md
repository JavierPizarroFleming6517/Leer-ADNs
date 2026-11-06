# Guía para probar TrazaGen paso a paso

Recorre todo el flujo con los archivos de `examples/demo/`. Sigue el mismo orden que el guion del video y agrega algunas pruebas de error («esto debe fallar») que muestran la seguridad.

**Cómo funciona el laboratorio en esta versión:** el laboratorio es **externo** a TrazaGen. La plataforma registra a qué laboratorio se envió el sticker y recibe el resultado (el archivo con el perfil STR). No registra los procesos internos del laboratorio.

**Antes de empezar**

```bash
npm run demo:reset
```

```bash
npm run dev
```

Abre http://localhost:5173 y entra como **Camila Rojas** (administración). La contraseña está en `server/.env`:

```bash
grep DEMO_PASSWORD server/.env
```

---

## 1. Inicio y alertas

1. Arriba a la derecha deben estar en verde **API**, **Base de datos** y **Motor biométrico**. Si el motor biométrico se cae, aparece una franja roja «Motor biométrico no disponible».
2. En **Inicio** revisa:
   - Las tarjetas: 10 personas, 8 vínculos firmados, 39 huellas y las verificaciones del mes.
   - **Alertas**: «Posible huella duplicada» y «2 intentos de QR falso».
   - **Stickers por estado**: 30 nuevos, 2 procesados, 6 en uso y 2 finalizados.
   - **En el laboratorio externo**: 2 stickers enviados que esperan su resultado, con los días de espera.
3. Clic en la alerta **Posible huella duplicada** → pestaña **Huellas** del sticker. El dedo en rojo coincide con el de **Matías Herrera Lagos**, con un puntaje ≈ 370 de SourceAFIS.

## 2. Crear un lote e imprimir etiquetas

1. **Stickers y lotes** → **Crear lote**.
2. Plantilla **«Internacional — 5 dedos (mano derecha)»**, cantidad **5** → **Generar lote**.
3. En la grilla de etiquetas QR prueba **Imprimir / Guardar PDF** y **CSV para la fábrica**.
4. **Guarda la imagen de un QR** para el paso siguiente: clic derecho sobre el primer QR → «Guardar imagen como…».

## 3. Toma de muestra y envío al laboratorio

### 3.1 Verificar el QR
1. **Verificación** → **Por QR** → sube la foto del QR guardado. También sirve la cámara, o pegar el código o la URL del QR.
2. Aparece **«QR auténtico»** → **Ver expediente**. La ficha muestra «QR auténtico: firma Ed25519 verificada» y la barra del ciclo de vida en **Nuevo**.

### 3.2 Persona y consentimiento
1. **Iniciar toma** → **Persona nueva**. Datos ficticios, por ejemplo: Martina · Olivares Reyes · PASAPORTE · F7734120 · Chile · Chilena · 1996-06-18 · Femenino.
2. **Asociar al sticker**.
3. En **Consentimiento informado**, sube `examples/demo/consentimiento_firmado.pdf`.

🔴 **Prueba de error:** en otro sticker nuevo intenta crear una persona con el **mismo documento**. Debe rechazarse: «Ya existe una persona registrada con ese documento». La búsqueda usa el índice ciego, sin descifrar.

### 3.3 Toma y huellas
1. Pestaña **Toma** → **Registrar toma**.
2. Pestaña **Huellas**, origen Escáner, **DPI 500**:
   - Casilla **2 (índice derecho)** → `examples/demo/toma/dedo_nuevo_indice_derecho.png` → ✅ «sin duplicados», con las minucias dibujadas.
   - Casilla **3 (medio derecho)** → `examples/demo/toma/dedo_repetido.png` → 🔴 alerta: coincide con el pulgar derecho de **Matías Herrera Lagos** (≈ 242).
3. El sticker pasa a **Procesado**.

🔴 **Prueba de error:** vuelve a subir una imagen a la casilla 2: «ya tiene una huella registrada. Las huellas no se reemplazan».

### 3.4 Envío al laboratorio externo
1. Pestaña **Laboratorio y perfil** → completa destino, transportista y sello → **Registrar envío**.
2. El circuito queda en «Enviado al laboratorio» → «Resultado recibido: Esperando · 0 días». El sticker aparece en el Inicio, en «En el laboratorio externo».

## 4. Resultado del laboratorio

El laboratorio devuelve un archivo cuyo `SPECIMENID` debe ser **el código del sticker**. Como los códigos son aleatorios, el archivo de prueba se genera para tu sticker con un comando.

1. Sigue en el sticker del paso 3 (pestaña **Laboratorio y perfil**).
2. Sube `examples/demo/perfil_otra_muestra.xml` → 🔴 **Archivo rechazado**: «El archivo corresponde a otra muestra. Contiene TG-9Q4M-2XKD; se esperaba TG-…, el código de este sticker».
3. En una terminal, genera el resultado para **tu** sticker (usa su código, el que aparece en la ficha):

```bash
npm run demo:resultado -- TG-XXXX-XXXX
```

   Crea `examples/demo/resultados/TG-XXXX-XXXX.xml`: un CODIS CMF con `SPECIMENID` = el código del sticker y un perfil GlobalFiler ficticio. Es una herramienta de demostración; en la realidad ese archivo lo entrega el laboratorio.
4. Sube ese archivo con el kit **GlobalFiler** → ✅ **Perfil aceptado · 20/20 CODIS**, «Sin coincidencias en el registro». El sticker pasa a **En uso** (llegó el perfil y queda material).

**Atajo sin terminal:** en **Inicio** → «En el laboratorio externo», abre el sticker sembrado que lleva **más días** esperando (el que no tiene huella duplicada) y sube `examples/demo/perfil_sticker_en_lab.xml`, que ya trae su código.
4. (Opcional) **Adjuntar archivo**: sube cualquier PDF como informe del laboratorio; queda «almacenado, no interpretado», con su SHA-256.
5. (Opcional) **«El laboratorio informa material agotado»** → el sticker pasa a **Finalizado**.

## 5. Vínculo y custodia

1. Pestaña **Vínculo** → **Firmar vínculo** → **Verificar integridad** → ✅ «✓ Vínculo íntegro».
2. Pestaña **Custodia** → **Verificar cadena** → ✅ «✓ Cadena íntegra». Se ven el envío y el resultado del laboratorio como eventos encadenados.

## 6. Verificación

1. **Verificación** → **Por huella**, DPI 500:
   - `examples/demo/huella_para_verificar.png` → ✅ «Coincide con Valeria Andrea Contreras Ibáñez», meñique derecho, puntaje ≈ 166.
   - `examples/demo/huella_desconocida.png` → «Sin coincidencias».
2. **Por perfil genético** → `examples/demo/perfil_persona_registrada.xml` → ✅ «Coincide con Camila Andrea Vargas Peña».

## 7. Alteración directa en la base

```bash
npm run demo:alterar
```

Abre el sticker de **Matías Herrera Lagos** (Personas → «Matías») → **Vínculo** → **Verificar integridad** → 🔴 «✗ Vínculo alterado», con el **locus D8S1179** en la tabla «Qué cambió». El Inicio muestra «Vínculo con integridad alterada».

🔴 **La custodia no se puede editar ni borrar desde la base:**

```bash
psql postgresql://trazagen:trazagen@localhost:5432/trazagen -c "UPDATE \"EventoCustodia\" SET \"responsableNombre\" = 'otro';"
```

Debe responder `ERROR: La cadena de custodia es de solo inserción`. Lo mismo con `DELETE` sobre cualquier sticker que se haya usado.

## 8. Eliminar y anular

1. **Stickers y lotes** → un sticker **Nuevo** → **Eliminar**: se borra (nunca se usó).
2. El sticker con la huella duplicada → **Anular** → escribe el motivo → queda **Anulado**: no se borra, su custodia sigue íntegra (con un evento «Anulación del sticker»), su vínculo se revoca y deja de aparecer en las búsquedas y alertas.
3. En **Lotes**, «Eliminar» solo se habilita en un lote sin ningún sticker usado.

## 9. QR falso y celular

```
http://localhost:5173/s/TG-ABCD-EFGH.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
```

🔴 Pantalla roja **«Código no emitido por TrazaGen»**; el intento queda en **Auditoría**.

Para el celular en la misma Wi-Fi: `hostname -I` → en `server/.env` pon `APP_URL=http://TU-IP:5173` → reinicia `npm run dev` → `sudo firewall-cmd --add-port=5173/tcp` (Fedora) → escanea el QR de una ficha con la cámara del teléfono.

## Al terminar

```bash
npm run demo:reset
```

`datasets/asignacion.json` y `examples/demo/perfil_sticker_en_lab.xml` cambian en cada reset (códigos de sticker nuevos). Puedes descartarlos:

```bash
git checkout datasets/asignacion.json examples/demo/perfil_sticker_en_lab.xml
```
