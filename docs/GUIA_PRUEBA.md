# Guía para probar TrazaGen paso a paso

Todos los archivos que vas a subir están en **`examples/demo/`**, ordenados por paso (`paso3_toma`, `paso4_laboratorio`, `paso6_verificacion`). Son siempre los mismos: la siembra no los toca. El resumen está en `examples/demo/LEEME.txt`.

El sticker para hacer la toma completa en vivo es siempre **`TG-7M4K-2QRT`**, el mismo en todas las máquinas.

**Cómo funciona el laboratorio en esta versión:** el laboratorio es **externo** a TrazaGen. La plataforma registra a qué laboratorio se envió el sticker y recibe el resultado (el archivo con el perfil STR). No registra los procesos internos del laboratorio.

## Antes de empezar

```bash
npm run demo:reset
```

```bash
npm run dev
```

Abre http://localhost:5173 y entra como **Camila Rojas**. La contraseña está en `server/.env`:

```bash
grep DEMO_PASSWORD server/.env
```

Si haces el recorrido otra vez, vuelve a correr `npm run demo:reset` antes: deja todo como nuevo.

---

## 1. Inicio y alertas

1. Arriba a la derecha: **API**, **Base de datos** y **Motor biométrico** en verde.
2. En **Inicio**:
   - **Alertas**: «Posible huella duplicada» y «2 intentos de QR falso».
   - **Stickers por estado**: 30 nuevos, 2 procesados, 6 en uso y 2 finalizados.
   - **En el laboratorio externo**: 2 stickers esperando su resultado.
3. Clic en la alerta de huella duplicada: el dedo en rojo coincide con el de **Matías Herrera Lagos** (puntaje ≈ 370).

## 2. Crear un lote e imprimir etiquetas

1. **Stickers y lotes** → **Crear lote** → plantilla **«Internacional — 5 dedos (mano derecha)»**, cantidad **5** → **Generar lote**.
2. Prueba **Imprimir / Guardar PDF** y **CSV para la fábrica**.

## 3. Toma de muestra · sticker `TG-7M4K-2QRT`

1. **Verificación** → **Por QR** → escribe **`TG-7M4K-2QRT`** → **Verificar** → **Ver expediente**.
   - Si quieres ver «QR auténtico»: **Stickers y lotes** → **Lotes** → lote `L-2026-003` → **Etiquetas QR**, busca la etiqueta **TG-7M4K-2QRT**, guarda su imagen (clic derecho) y súbela en **Foto del QR**.
2. **Iniciar toma** → **Persona nueva** con datos ficticios (por ejemplo: Martina · Olivares Reyes · PASAPORTE · F7734120 · Chile · Chilena) → **Asociar al sticker**.
3. **Consentimiento informado** → sube `paso3_toma/consentimiento_firmado.pdf`.
4. Pestaña **Toma** → **Registrar toma**.
5. Pestaña **Huellas**, DPI **500**:
   - Casilla **2** → `paso3_toma/huella_indice_derecho.png` → ✅ «sin duplicados», con las minucias dibujadas.
   - Casilla **3** → `paso3_toma/huella_medio_derecho_repetida.png` → 🔴 «coincide con una huella de otro sticker» (Matías Herrera Lagos, ≈ 242).
6. Pestaña **Laboratorio y perfil** → **Registrar envío**. Queda «Esperando · 0 días».

## 4. Resultado del laboratorio · mismo sticker `TG-7M4K-2QRT`

En la misma pestaña **Laboratorio y perfil**, kit **GlobalFiler**:

1. Sube `paso4_laboratorio/1_resultado_de_otra_muestra.xml` → 🔴 **Archivo rechazado**: «El archivo corresponde a otra muestra. Contiene TG-9Q4M-2XKD; se esperaba TG-7M4K-2QRT».
2. Sube `paso4_laboratorio/2_resultado_TG-7M4K-2QRT.xml` → ✅ **Perfil aceptado · 20/20 CODIS**, «Sin coincidencias en el registro». El sticker pasa a **En uso**.

## 5. Vínculo y custodia

1. Pestaña **Vínculo** → **Firmar vínculo** → **Verificar integridad** → ✅ «✓ Vínculo íntegro».
2. Pestaña **Custodia** → **Verificar cadena** → ✅ «✓ Cadena íntegra».

## 6. Verificación

**Verificación** → **Por huella** (DPI 500):

1. `paso6_verificacion/1_huella_registrada.png` → ✅ «Coincide con Valeria Andrea Contreras Ibáñez», meñique derecho, puntaje ≈ 166.
2. `paso6_verificacion/2_huella_desconocida.png` → «Sin coincidencias».
3. **Por perfil genético** → `paso6_verificacion/3_perfil_registrado.xml` → ✅ «Coincide con Camila Andrea Vargas Peña».

## 7. Alteración directa en la base

```bash
npm run demo:alterar
```

Abre el sticker **`TG-2K7X-9MFB`** (Matías Herrera Lagos) → **Vínculo** → **Verificar integridad** → 🔴 «✗ Vínculo alterado», con el **locus D8S1179** en «Qué cambió». El Inicio muestra «Vínculo con integridad alterada».

## 8. Eliminar y anular

1. **Stickers y lotes** → un sticker **Nuevo** → **Eliminar**: se borra (nunca se usó).
2. Sticker **`TG-0ZKT-7HEB`** (el de la huella duplicada) → **Anular** → escribe el motivo → queda **Anulado**: no se borra, su custodia sigue íntegra y sale de las búsquedas y alertas.

## 9. QR falso

Abre en el navegador:

```
http://localhost:5173/s/TG-ABCD-EFGH.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
```

🔴 Pantalla roja «Código no emitido por TrazaGen»; el intento queda en **Auditoría**.

## Al terminar

```bash
npm run demo:reset
```

No deja archivos modificados en git.

## Para otros stickers (opcional)

Si quieres hacer el recorrido con un sticker distinto de `TG-7M4K-2QRT` (por ejemplo, uno del lote que creaste en el paso 2), genera su archivo de resultado con:

```bash
npm run demo:resultado -- TG-XXXX-XXXX
```

Queda en `examples/demo/resultados/TG-XXXX-XXXX.xml` (fuera de git).
