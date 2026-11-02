# Locus ID · Identificación genética con QR

Prototipo que recibe el archivo que entrega un laboratorio genético (CODIS CMF XML, el formato de importación del FBI, o una planilla de genotipos), lo convierte a JSON en el servidor, valida el perfil contra los 20 loci CODIS, revisa si ya existe en el registro y lo vincula a una persona con un código QR. Los datos se guardan en PostgreSQL. No es un sistema de producción y no debe usarse con información real.

Flujo: **archivo del laboratorio → validación y JSON → revisión del perfil → datos de la persona + huella (simulada) → QR → expediente en el celular.**

La demo tiene tres partes:

- `server`: API NestJS.
- `client/admin`: registro de personas y generación de QR. Corre en el puerto 5173.
- `client/reader`: consulta del expediente. Corre en el puerto 5174.

## Requisitos

- Node.js 20 o superior.
- Una base PostgreSQL en Neon.
- La cadena de conexión directa, no la del pooler.

## Configuración

En PowerShell, desde la raíz del repositorio:

```powershell
copy server\.env.example server\.env
```

Edita `server\.env` y completa estos valores. El archivo está ignorado por Git.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Cadena directa de Neon, con `sslmode=require`. |
| `JWT_SECRET` | Secreto del JWT de demostración. Mínimo 16 caracteres. |
| `DEMO_ADMIN_PASSWORD` | Contraseña del administrador. |
| `DEMO_READER_PASSWORD` | Contraseña del lector. Debe ser distinta de la anterior. |
| `READER_BASE_URL` | URL del lector que se codifica en el QR. Por defecto, `http://localhost:5174`. |
| `PORT` | Puerto de la API. Por defecto, `3000`. |

Para generar un secreto:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Las contraseñas solo viven en el servidor. El frontend nunca las recibe ni quedan en el repositorio.

## Base de datos

La aplicación usa exactamente tres tablas de dominio: `Persona`, `PerfilGenetico` y `HuellaDactilar`. Prisma además crea `_prisma_migrations` para aplicar las migraciones.

Desde la raíz del repositorio:

```powershell
cd server
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ..
```

El seed es opcional. Crea a Ana Lucía Quinteros (`DEMO-SEED-001`) con un perfil ficticio de 20 loci CODIS y la referencia simulada `SIM-REF-0001`. No crea un QR: se genera desde el administrador.

Si ya tenías la base de la versión anterior, `npx prisma migrate deploy` aplica la migración `formatos_laboratorio` (quita las alertas clínicas y agrega nacionalidad y el origen del archivo). Después corre `npm install` en `server` para instalar `fast-xml-parser` y `exceljs`.

## Ejecución

Instala las dos aplicaciones, también desde la raíz:

```powershell
cd client\admin
npm install
cd ..\reader
npm install
cd ..\..
```

Abre tres terminales en la raíz del repositorio.

```powershell
cd server
npm run start:dev
```

```powershell
cd client\admin
npm run dev
```

```powershell
cd client\reader
npm run dev
```

También puedes instalar la raíz y levantar los tres procesos juntos, después de completar `server\.env` y aplicar las migraciones:

```powershell
npm install
npm run dev
```

- Administrador: http://localhost:5173
- Lector: http://localhost:5174
- API: http://localhost:3000

## Archivos de ejemplo

| Archivo | Qué es |
| --- | --- |
| `examples/cmf_lote_laboratorio.xml` | CODIS CMF (Rapid Import) con 11 muestras. Valida contra el esquema de la especificación del FBI. |
| `examples/planilla_genotipos_laboratorio.xlsx` | Las mismas 11 muestras como planilla de genotipos (dos columnas por locus), como la exporta el software de análisis. |

Los dos archivos producen exactamente el mismo JSON. El servidor también acepta CSV. Si se sube un `.fsa` o `.hid` (archivo crudo del secuenciador), responde que primero debe analizarse en el laboratorio.

## Recorrido de la demo (guion para el video)

1. Entra al administrador con `DEMO_ADMIN_PASSWORD`.
2. Arrastra `examples/cmf_lote_laboratorio.xml`. El servidor lo valida, lo convierte a JSON y lo compara con el registro.
3. Revisa una muestra: indicadores (20/20 CODIS, loci, amelogenina), grilla de marcadores y el JSON normalizado.
4. **Asociar a una persona**: nombre, documento, nacionalidad y fecha. La huella aparece como asociada a la muestra.
5. **Registrar y generar QR**: aparece el QR, la URL y la opción de descargarlo.
6. Escanea el QR con el teléfono (o pulsa **Abrir expediente**) y entra con `DEMO_READER_PASSWORD`.
7. El expediente muestra identidad, perfil genético, huella simulada y el origen del dato (archivo y hash SHA-256).
8. Vuelve al administrador y sube `examples/planilla_genotipos_laboratorio.xlsx`: la muestra registrada aparece como **Registrada** y no se puede volver a registrar a nombre de otra persona.

Si generas otro QR para la misma persona, el anterior deja de funcionar. En la base solo se guarda el hash SHA-256 del token, no el token.

Para escanear desde un teléfono, la URL del QR tiene que apuntar a esta computadora. Pon en `server\.env` la IP local, por ejemplo `READER_BASE_URL=http://192.168.1.20:5174`, reinicia la API y genera el QR de nuevo. El lector ya escucha en la red. Si el teléfono no llega a la API, permite Node.js en el firewall de Windows. El lector llama a la API en el puerto 3000 del mismo host desde el que se abrió la página.

## Huella dactilar simulada

Al registrar una persona se crea una referencia ficticia (`SIM-XXXXXX`).

## Endpoints

| Método | Ruta | Acceso |
| --- | --- | --- |
| `POST` | `/auth/login` | Público. Devuelve un JWT de 8 horas según la contraseña. |
| `POST` | `/muestras/analizar` | Administrador. Archivo multipart en el campo `archivo` (`.xml`, `.xlsx`, `.csv`, máx. 5 MB). Devuelve el JSON, el resumen y las coincidencias. No guarda nada. |
| `POST` | `/personas/importar` | Administrador. Rechaza un perfil que ya esté registrado. |
| `GET` | `/personas` | Administrador. |
| `POST` | `/personas/:id/qr` | Administrador. |
| `POST` | `/qr/resolver` | Lector. El token del QR viaja en el cuerpo. |

La importación crea la persona, su perfil y la referencia de huella en una sola operación. Un documento repetido o un perfil que ya existe en el registro responde con un error y no deja datos a medias. Una coincidencia exige al menos 10 loci comparables idénticos.

## Alcance

Este prototipo no analiza el archivo crudo del secuenciador (`.fsa`), no reconoce huellas ni rostros y no calcula estadística forense (probabilidad de coincidencia, parentesco). La búsqueda en el registro es solo por coincidencia exacta. El XSD del CMF se transcribió de la especificación pública del FBI y debe compararse con la versión oficial. La autenticación por dos contraseñas de entorno es solo para la demostración y debe reemplazarse antes de usar información real.
