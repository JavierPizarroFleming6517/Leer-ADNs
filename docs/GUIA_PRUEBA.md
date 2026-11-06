# Guía para probar TrazaGen paso a paso

Recorre todo el flujo con los archivos de `examples/demo/`. Sigue el mismo orden que el guion del video y agrega algunas pruebas de error («esto debe fallar») que muestran la seguridad.

**Antes de empezar**

```bash
npm run demo:reset
```

```bash
npm run dev
```

Abre http://localhost:5173. La contraseña de los 4 usuarios está en `server/.env`:

```bash
grep DEMO_PASSWORD server/.env
```

Para cambiar de usuario: ícono de salida arriba a la derecha → en el login, clic en otra persona de «Usuarios de demostración».

| Usuario | Rol |
| --- | --- |
| Camila Rojas | Administración |
| Diego Fuentes | Operador de toma |
| Dra. Valentina Soto | Laboratorio |
| Andrés Muñoz | Verificador |

---

## 1. Administración: Inicio y alertas · *Camila Rojas*

1. Entra como **Camila Rojas**.
2. Arriba a la derecha deben estar en verde **API**, **Base de datos** y **Motor biométrico**.
3. En **Inicio** revisa:
   - Las tarjetas: 10 personas, 8 vínculos firmados, 39 huellas y las búsquedas del mes.
   - **Alertas**: «Posible huella duplicada», «2 intentos de QR falso» y «Sello dañado al recibir».
   - **Stickers por estado**: 30 nuevos, 1 procesado, 7 en uso y 2 finalizados.
4. Clic en la alerta **Posible huella duplicada** → pestaña **Huellas** del sticker. El dedo en rojo coincide con el de **Matías Herrera Lagos**, con un puntaje ≈ 370 de SourceAFIS. Clic en el dedo para ver la imagen y las minucias.
5. Pestaña **Laboratorio** del mismo sticker: la recepción quedó registrada con **sello dañado**.

✅ **Esperado:** alertas reales calculadas desde la base, no textos fijos.

## 2. Crear un lote e imprimir etiquetas · *Camila Rojas*

1. Menú **Stickers y lotes** → **Crear lote**.
2. Plantilla **«Internacional — 5 dedos (mano derecha)»**, cantidad **5** → **Generar lote**.
3. Se abre la grilla de etiquetas QR:
   - **Imprimir / Guardar PDF**: guarda el PDF.
   - **CSV para la fábrica**: descarga el código y la URL firmada de cada sticker.
4. **Guarda la imagen de un QR** para el paso siguiente: clic derecho sobre el primer QR → «Guardar imagen como…» (por ejemplo `~/Descargas/qr1.png`). Anota también su código `TG-XXXX-XXXX`.

✅ **Esperado:** 5 stickers con código aleatorio en formato Crockford base32 (sin I, L, O ni U).

## 3. Toma de muestra · *Diego Fuentes*

### 3.1 Escanear
1. Sal y entra como **Diego Fuentes** (operador).
2. Menú **Escanear** → en **Foto del QR** sube `qr1.png`. También sirve la cámara («Activar cámara») apuntando al QR en otra pantalla, o escribir el código en «Código manual».
3. Se abre la ficha del sticker con el aviso verde **«QR auténtico: firma Ed25519 verificada»**. Si escribiste el código a mano, el aviso dice «Código encontrado en el registro» (sin firma que verificar).

### 3.2 Asociar persona y consentimiento
1. Botón **Iniciar toma** → pestaña **Persona y consentimiento**, en modo **Persona nueva**.
2. Completa con datos ficticios, por ejemplo: Martina · Olivares Reyes · PASAPORTE · F7734120 · Chile · Chilena · 1996-06-18 · Femenino.
3. **Asociar al sticker**. La ficha muestra el aviso «Datos sensibles cifrados» y, como operador, ves el documento **enmascarado**.
4. En **Consentimiento informado**, sube `examples/demo/consentimiento_firmado.pdf`. Aparece «Consentimiento guardado» con su SHA-256.

🔴 **Prueba de error:** en otra ficha nueva, intenta crear una persona con el **mismo documento** (PASAPORTE F7734120, Chile). Debe rechazarse: «Ya existe una persona registrada con ese documento». La búsqueda usa el índice ciego, sin descifrar.

### 3.3 Toma
1. Pestaña **Toma** → deja lugar y fecha (puedes marcar un dedo como «no obtenible» con un motivo) → **Registrar toma**.
2. (Opcional) En la misma pestaña, **Registrar envío** al laboratorio.

### 3.4 Huellas
1. Pestaña **Huellas**. Origen **Escáner**, **DPI 500**.
2. Clic en la casilla **2 (índice derecho)** → elige `examples/demo/toma/dedo_nuevo_indice_derecho.png`.
   - ✅ Aviso verde: «Índice derecho: N minucias extraídas · sin duplicados», comparada 1:N contra las demás huellas.
   - A la derecha se ve la imagen con las **minucias dibujadas** (círculo = terminación, cuadrado = bifurcación). Prueba el checkbox «Minucias».
3. Clic en la casilla **3 (medio derecho)** → elige `examples/demo/toma/dedo_repetido.png`.
   - 🔴 **Alerta roja:** «Medio derecho coincide con una huella de otro sticker» → Pulgar derecho de **Matías Herrera Lagos**, puntaje ≈ 242.
4. El sticker pasa a estado **Procesado** (barra del ciclo de vida).

🔴 **Prueba de error:** vuelve a subir una imagen a la casilla 2. Debe rechazarse: «ya tiene una huella registrada. Las huellas no se reemplazan».

## 4. Laboratorio · *Dra. Valentina Soto*

1. Sal y entra como **Dra. Valentina Soto**.
2. Menú **Laboratorio** → en la columna **Cuantificación**, abre la muestra **M-000009**.
3. Pestaña **Perfil genético**: sube `examples/demo/perfil_sticker_en_lab.xml` **antes** de registrar las etapas.
   - 🔴 Debe pedir: «Registra primero todas las etapas del laboratorio, hasta la interpretación».
4. Pestaña **Laboratorio**: registra en orden
   - **Amplificación**: kit **GlobalFiler** → «Registrar amplificación».
   - **Electroforesis** → «Registrar electroforesis».
   - **Interpretación** → «Registrar interpretación».
   - Cada etapa aparece en la línea de la izquierda con fecha y responsable.
5. (Opcional) **Adjuntar archivo**: sube cualquier archivo (por ejemplo un PDF). Queda listado como «almacenado, no interpretado», con su SHA-256.
6. Pestaña **Perfil genético**:
   - Sube `examples/demo/perfil_otra_muestra.xml` → 🔴 **Archivo rechazado**: «El archivo corresponde a otra muestra. Contiene M-000431; se esperaba M-000009».
   - Sube `examples/demo/perfil_sticker_en_lab.xml` → ✅ **Perfil aceptado · 20/20 CODIS · muestra M-000009**, «Sin coincidencias en el registro». Abajo aparece la grilla de alelos ordenada.

## 5. Vínculo y custodia · *Dra. Valentina Soto*

1. Pestaña **Vínculo** → **Firmar vínculo**.
2. **Verificar integridad** → ✅ **«✓ Vínculo íntegro»**, con todas las comprobaciones en verde. Revisa el documento canónico, la firma y la llave pública.
3. Pestaña **Custodia** → **Verificar cadena** → ✅ **«✓ Cadena íntegra · N eventos»**. Cada evento muestra su hash y el del anterior.

## 6. Verificación · *Andrés Muñoz*

1. Sal y entra como **Andrés Muñoz** (verificador).
2. Menú **Verificación** → **Por huella**, DPI **500**:
   - Sube `examples/demo/huella_para_verificar.png` → ✅ **«Coincide con Valeria Andrea Contreras Ibáñez»**, meñique derecho, puntaje ≈ 166. Se ven la huella consultada con sus minucias, la registrada y los 5 puntajes más altos con la línea del umbral (40).
   - Sube `examples/demo/huella_desconocida.png` → **«Sin coincidencias»**, con el puntaje más alto bajo 40.
3. **Por perfil genético** → `examples/demo/perfil_persona_registrada.xml` → ✅ **«Coincide con Camila Andrea Vargas Peña»**.
4. **Por QR** → escribe un código de sticker → «Código registrado» y el botón «Ver expediente».
5. **Datos por rol**: abre ese expediente → pestaña **Perfil genético** → el verificador ve solo el resumen: «Tu rol ve el resumen del perfil, no los alelos».

## 7. Alteración directa en la base · *terminal + Camila Rojas*

1. En una terminal (con `npm run dev` corriendo en otra):

```bash
npm run demo:alterar
```

   Imprime la persona (**Matías Ignacio Herrera Lagos**), su sticker y el cambio (D8S1179: 12, 15 → 12, 16).

2. Entra como **Camila Rojas** → **Personas** → busca «Matías» → clic en su sticker → pestaña **Vínculo** → **Verificar integridad**.
   - 🔴 **«✗ Vínculo alterado»**: falla «Perfil genético» y la tabla «Qué cambió» muestra el **locus D8S1179**, el valor del archivo del laboratorio y el valor que hay hoy en la base.
3. **Inicio** → nueva alerta «Vínculo con integridad alterada».

🔴 **Prueba extra: la custodia no se puede editar ni desde la base.**

```bash
psql postgresql://trazagen:trazagen@localhost:5432/trazagen -c "UPDATE \"EventoCustodia\" SET \"responsableNombre\" = 'otro';"
```

Debe responder: `ERROR: La cadena de custodia es de solo inserción: UPDATE no está permitido sobre EventoCustodia`. Lo mismo con `DELETE`.

## 8. QR falso y vista desde el celular

### QR falso
En el navegador abre una URL con firma inventada:

```
http://localhost:5173/s/TG-ABCD-EFGH.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
```

🔴 Pantalla roja **«Código no emitido por TrazaGen»**. El intento queda en **Auditoría** (como admin, filtra por «QR falso o no emitido»).

### Celular en la misma red Wi-Fi
1. IP del computador:

```bash
hostname -I
```

2. En `server/.env`: `APP_URL=http://TU-IP:5173`. Reinicia `npm run dev` (Ctrl+C y de nuevo).
3. Abre el puerto en el firewall de Fedora (solo hasta reiniciar):

```bash
sudo firewall-cmd --add-port=5173/tcp
```

4. Abre la ficha de una persona registrada → clic en su QR (arriba a la izquierda) → escanéalo con la **cámara del teléfono** → inicia sesión → expediente adaptado a la pantalla del celular.
   - Como **verificador**: no ve los alelos.
   - Como **laboratorio**: no ve el número de documento («Oculto para tu rol»).

## 9. Otras pantallas (como admin)

- **Custodia**: buscador global por código de sticker, responsable o prefijo de hash.
- **Auditoría**: inicios de sesión, consultas, perfiles rechazados, QR falsos e intentos fallidos (en rojo), con IP.
- **Administración**: usuarios (crear o desactivar), plantillas de sticker por país y kits con sus loci.
- **Personas**: el admin ve el documento completo; el operador y el verificador lo ven enmascarado.

## Al terminar

Para dejar todo como nuevo (incluido lo alterado):

```bash
npm run demo:reset
```

`datasets/asignacion.json` cambia en cada reset (códigos de sticker nuevos). Puedes descartar el cambio:

```bash
git checkout datasets/asignacion.json
```
