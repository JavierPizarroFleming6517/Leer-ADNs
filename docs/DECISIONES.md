# Decisiones y limitaciones conocidas

Registro de lo que se decidió durante la construcción de la demo de TrazaGen y que el documento de requisitos no cubría.

## Arquitectura

- **Una sola API detrás de `/api`.** La app web llama a `/api/...` en su mismo origen y Vite redirige al servidor NestJS (puerto 3000). Un celular en la red local solo necesita llegar al puerto 5173 y el CORS del servidor queda restringido a `APP_URL`.
- **Archivos en la base.** Imágenes de huellas (original y PNG), PDF de consentimientos y archivos de laboratorio se guardan como `bytea` en PostgreSQL junto a su SHA-256. Simplifica `demo:reset` y la verificación de integridad (todo se recalcula desde la base).
- **PNG para mostrar generado por `afis`.** El microservicio decodifica la imagen (incluido TIFF) con `ImageIO` y devuelve el PNG junto con la plantilla, así el servidor no necesita librerías de imágenes nativas. La plantilla siempre se extrae de la imagen original con su DPI.
- **Minucias desde la plantilla serializada.** `FingerprintTemplate.toByteArray()` de SourceAFIS 3.18.1 es CBOR con arreglos paralelos `positionsX`, `positionsY`, `directions` (radianes) y `types` (`E` terminación, `B` bifurcación). Se deserializa con Jackson CBOR; no hizo falta la API de transparencia.
- **React 19.** El repositorio ya usaba React 19 (no 18); se mantuvo para no degradar dependencias.
- **`demo:reset` sin `prisma migrate reset`.** El trigger impide borrar eventos de custodia, así que el reset recrea el esquema (`DROP SCHEMA … CASCADE`) y vuelve a aplicar las migraciones con `prisma migrate deploy`. Esto exige que el usuario de `DATABASE_URL` sea dueño del esquema.
- **Servicios reales en la siembra.** `npm run seed` arranca el contexto de NestJS y llama a los mismos servicios que la API (con fechas pasadas): el cifrado, la custodia, la extracción y búsqueda en SourceAFIS, la validación de perfiles y las firmas son las de producción. Por eso la siembra necesita `afis` en marcha; `setup` y `demo:reset` lo levantan temporalmente si no está corriendo.
- **Una llave Ed25519 para QR y vínculos.** Un solo par en `server/.env`. Los textos firmados llevan un prefijo de dominio distinto (`TrazaGen/QR/v1:` y el tipo `TrazaGen/VinculoDactilogenetico` en el documento canónico), así una firma de un contexto no sirve en el otro.
- **La URL del QR se calcula, no se guarda.** Se firma solo el código; la URL se arma con `APP_URL` al mostrarla. Cambiar `APP_URL` cambia las URL que se muestran, pero la firma sigue siendo válida.
- **Código manual sin firma.** Si se escribe el código a mano no hay firma que verificar: se acepta si el sticker existe y la ficha lo indica («código ingresado a mano»). Si no existe, se trata como QR falso y queda en auditoría.
- **Estados del sticker derivados de los hechos.** `PROCESADO` cuando hay toma y al menos una huella; `EN_USO` desde la extracción; `FINALIZADO` cuando el laboratorio marca «material agotado» (evento de custodia de la etapa en curso con `materialAgotado: true`). El estado nunca retrocede.
- **Etapas del laboratorio en orden.** Solo se puede registrar la etapa siguiente, y el perfil se carga después de la interpretación. El kit declarado en la amplificación es el que valida los loci del perfil; un archivo con loci que el kit no amplifica se rechaza, y los loci del kit sin dato se informan como advertencia.
- **Las huellas no se reemplazan.** Una casilla con huella no admite otra imagen (es evidencia). Se rechazan imágenes con menos de 8 minucias.
- **Duplicados.** Al digitalizar, cada huella se compara 1:N contra todas las huellas de **otros** stickers. Las que superan el umbral quedan como `CoincidenciaHuella`, en la custodia (detalle del evento) y como alerta en el Inicio y en la ficha. No bloquean la toma: la decisión es de una persona.
- **Números en la custodia.** Los números del detalle de un evento se guardan con 12 cifras significativas: `jsonb` (vía Prisma) no conserva siempre el último dígito de un `double` de 17 cifras y el hash recalculado no coincidía. Hay una prueba para esto.
- **«Qué cambió» en el vínculo.** El documento firmado guarda hashes, no alelos. Cuando el hash del perfil no coincide, el servidor vuelve a leer el **archivo original del laboratorio** (guardado sin modificar, con su hash en la cadena) y lo compara locus por locus con lo que hay en la base.
- **Vínculos revocados.** Regenerar un vínculo marca el anterior como `REVOCADO` (con fecha) y nunca lo borra.
- **Contraseña de demo.** `npm run setup` genera una contraseña común (`Demo-xxxxxxxx`) en `server/.env` y la imprime; no hay contraseñas en el código.
- **Capturas en JPEG.** Las capturas del guion se guardan en JPEG (calidad 86, escala 2×) para que el repositorio no crezca con PNG de varios MB.

## Reparto de las huellas de FVC2002

FVC2002 sets B trae 40 dedos (DB1_B a DB4_B, dedos 101–110, 8 impresiones cada uno). El documento pedía 8 personas × 5 dedos usando 39 dedos y dejando uno de DB4 sin asignar. Pero la demo también necesita huellas **no registradas** para el sticker en laboratorio del guion (que debe poder firmar su vínculo sin ser un duplicado) y para la toma en vivo del paso 3 (que no debe disparar una alerta falsa). Con 40 dedos no alcanza para todo, y no hay otra base disponible (el sitio de FVC no era accesible desde el entorno y el documento pide no inventar huellas). Se decidió:

- **36 dedos** para las 8 personas completas: 4 personas con 5 huellas y 4 con 4 huellas y una casilla «no obtenible» con su motivo (cicatriz, amputación, vendaje, dermatitis). La octava persona tiene la quinta casilla no obtenible, como pedía el documento.
- **DB4_B/103** sin asignar: `huella_desconocida.png` (impresión `_2`).
- **DB1_B/105 y DB1_B/109** para el sticker en laboratorio del guion (las otras tres casillas, no obtenibles por grafito insuficiente).
- **DB1_B/107** reservado para la toma en vivo (`toma/dedo_nuevo_indice_derecho.png`).
- El **duplicado sembrado** es la impresión `_2` de DB2_B/101 cargada a otra persona; `toma/dedo_repetido.png` es la impresión `_3` de DB1_B/108. `huella_para_verificar.png` es la impresión `_5` de DB1_B/106.

`datasets/asignacion.json` (lo escribe la siembra) detalla cada asignación. Las imágenes de `examples/demo` se convierten a PNG con el propio `afis`; los códigos de sticker son aleatorios en cada siembra, pero el reparto de dedos y los códigos de muestra (M-000001…M-000010) son siempre los mismos.

## Evaluación del motor biométrico (datos reales)

`npm run test:afis` extrae las 320 imágenes de FVC2002 sets B con su DPI (DB2 a 569) y compara con SourceAFIS 3.18.1, umbral 40:

| | Pares | Sobre el umbral | Detalle |
| --- | --- | --- | --- |
| Genuinos (`_1` vs `_2`…`_8` del mismo dedo) | 280 | **226 (80,7 %)** | Mediana 102,2 |
| · DB1_B (500 DPI) | 70 | 65 (92,9 %) | |
| · DB2_B (569 DPI) | 70 | 66 (94,3 %) | |
| · DB3_B (500 DPI) | 70 | 44 (62,9 %) | Sensor capacitivo, imágenes pequeñas y secas |
| · DB4_B (500 DPI) | 70 | 51 (72,9 %) | Huellas sintéticas (SFinGe) |
| Impostores (`_1` vs `_1` de otro dedo) | 1.560 | **0 (0 %)** | Máximo 24,1, mediana 1,6 |

Minucias por imagen: mínimo 10, mediana 28, máximo 65. Los genuinos bajo el umbral se concentran en pocos dedos de DB3 y DB4 con impresiones muy desplazadas o parciales (FVC2002 las incluye a propósito); por eso las huellas de la demo para verificar y para la toma salen de DB1. Con este umbral no hubo ningún falso positivo. El informe completo, con cada par genuino bajo el umbral, queda en `docs/evaluacion-afis.json`.

## Limitaciones conocidas

- La comparación de perfiles STR es exacta (todos los loci comunes iguales, mínimo 10). No hay coincidencias parciales, mezclas ni estadística forense.
- El DPI lo declara quien sube la imagen. Una foto de celular sin escala conocida no se normaliza.
- El 1:N recorre todas las plantillas en cada búsqueda (milisegundos con decenas de huellas; para millones se necesita indexación o un AFIS dedicado). `afis` mantiene un caché LRU de plantillas deserializadas.
- La llave privada Ed25519 vive en `server/.env`. En producción debería estar en un HSM o KMS, con rotación y publicación de la llave pública.
- Solo la custodia tiene un trigger de solo inserción. La auditoría y los vínculos no se modifican ni se borran desde la API (los vínculos solo pasan de vigente a revocado), pero no tienen esa protección en la base.
- El lector de QR dentro de la app necesita HTTPS (o `localhost`) para acceder a la cámara. En red local se usa la cámara nativa del teléfono, el código manual o una foto.
- El trigger impide modificar la custodia, pero quien controle el servidor de base de datos puede desactivarlo o borrar el esquema; la cadena de hashes permite detectarlo y, para un sistema real, convendría anclar periódicamente el último hash en un registro externo.
- Si se recrea `server/.env` (llaves nuevas), los vínculos y QR existentes dejan de verificar: hay que ejecutar `npm run demo:reset`.
