# Decisiones y limitaciones conocidas

Registro de lo que se decidió durante la construcción de la demo de TrazaGen y que el documento de requisitos no cubría.

## Arquitectura

- **Una sola API detrás de `/api`.** La app web llama a `/api/...` en su mismo origen y Vite redirige al servidor NestJS (puerto 3000). Un celular en la red local solo necesita llegar al puerto 5173 y el CORS del servidor queda restringido a `APP_URL`.
- **Archivos en la base.** Imágenes de huellas (original y PNG), PDF de consentimientos y archivos de laboratorio se guardan como `bytea` en PostgreSQL junto a su SHA-256. Simplifica `demo:reset` y la verificación de integridad (todo se recalcula desde la base).
- **PNG para mostrar generado por `afis`.** El microservicio decodifica la imagen (incluido TIFF) con `ImageIO` y devuelve el PNG junto con la plantilla, así el servidor no necesita librerías de imágenes nativas. La plantilla siempre se extrae de la imagen original con su DPI.
- **Minucias desde la plantilla serializada.** `FingerprintTemplate.toByteArray()` de SourceAFIS 3.18.1 es CBOR con arreglos paralelos `positionsX`, `positionsY`, `directions` (radianes) y `types` (`E` terminación, `B` bifurcación). Se deserializa con Jackson CBOR; no hizo falta la API de transparencia.
- **React 19.** El repositorio ya usaba React 19 (no 18); se mantuvo para no degradar dependencias.
- **`demo:reset` sin `prisma migrate reset`.** El trigger impide borrar eventos de custodia, así que el reset recrea el esquema (`DROP SCHEMA … CASCADE`) y vuelve a aplicar las migraciones con `prisma migrate deploy`. Esto exige que el usuario de `DATABASE_URL` sea dueño del esquema.
