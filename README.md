# Identificación genética con QR

Prototipo para registrar personas ficticias con un perfil STR, alertas clínicas básicas y un código QR que abre su expediente. Los datos se guardan en PostgreSQL. No es un sistema de producción y no debe usarse con información real.

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

El seed es opcional. Crea a Ana Lucía Quinteros (`DEMO-SEED-001`), un perfil STR ficticio y la referencia simulada `SIM-REF-0001`. No crea un QR: se genera desde el administrador.

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

## Recorrido de la demo

1. Entra al administrador con `DEMO_ADMIN_PASSWORD`.
2. Sube `examples/persona-demo.json`.
3. Pulsa **Registrar**. La persona, sus alertas y su perfil STR quedan en PostgreSQL.
4. Pulsa **Generar QR**, descarga el PNG o copia la URL.
5. Abre esa URL en el lector.
6. Entra con `DEMO_READER_PASSWORD`.
7. El expediente muestra los mismos datos guardados.

Si generas otro QR para la misma persona, el anterior deja de funcionar. En la base solo se guarda el hash SHA-256 del token, no el token.

Para escanear desde un teléfono, la URL del QR tiene que apuntar a esta computadora. Pon en `server\.env` la IP local, por ejemplo `READER_BASE_URL=http://192.168.1.20:5174`, reinicia la API y genera el QR de nuevo. El lector ya escucha en la red. Si el teléfono no llega a la API, permite Node.js en el firewall de Windows. El lector llama a la API en el puerto 3000 del mismo host desde el que se abrió la página.

## Referencia de huella simulada

El archivo de ejemplo no incluye huella. El seed sí crea una referencia simulada, visible al consultar el QR de `DEMO-SEED-001`.

También puedes agregar este bloque opcional al JSON importado. Es un texto de demostración, no una plantilla biométrica:

```json
"huellaDactilar": {
  "referenciaSimulada": "SIM-REF-0002",
  "estado": "simulada"
}
```

Si no hay registro, el expediente indica que no existe una referencia asociada.

## Endpoints

| Método | Ruta | Acceso |
| --- | --- | --- |
| `POST` | `/auth/login` | Público. Devuelve un JWT de 8 horas según la contraseña. |
| `POST` | `/personas/importar` | Administrador. |
| `GET` | `/personas` | Administrador. |
| `POST` | `/personas/:id/qr` | Administrador. |
| `POST` | `/qr/resolver` | Lector. El token del QR viaja en el cuerpo. |

La importación crea la persona y su perfil en una sola transacción. Un identificador repetido responde con un error y no deja datos a medias.

## Alcance

Este prototipo no reconoce huellas, rostros ni perfiles genéticos. No analiza enfermedades, no compara marcadores y no controla acceso físico. La autenticación por dos contraseñas de entorno es solo para la demostración y debe reemplazarse antes de usar información real.
