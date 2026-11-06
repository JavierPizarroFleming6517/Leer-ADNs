-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR_TOMA', 'LABORATORIO', 'VERIFICADOR');

-- CreateEnum
CREATE TYPE "EstadoSticker" AS ENUM ('NUEVO', 'PROCESADO', 'EN_USO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "OrigenHuella" AS ENUM ('ESCANER', 'FOTO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('FABRICACION', 'TOMA', 'DIGITALIZACION_HUELLAS', 'ENVIO', 'RECEPCION_LAB', 'EXTRACCION', 'CUANTIFICACION', 'AMPLIFICACION', 'ELECTROFORESIS', 'INTERPRETACION', 'PERFIL_CARGADO', 'VINCULO_FIRMADO', 'VERIFICACION');

-- CreateEnum
CREATE TYPE "EstadoVinculo" AS ENUM ('VIGENTE', 'REVOCADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "institucion" TEXT,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaSticker" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "posiciones" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantillaSticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kit" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "loci" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "plantillaId" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fechaFabricacion" DATE NOT NULL,
    "versionDiseno" TEXT NOT NULL,
    "fabrica" TEXT NOT NULL,
    "creadoPorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sticker" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "loteId" UUID NOT NULL,
    "estado" "EstadoSticker" NOT NULL DEFAULT 'NUEVO',
    "personaId" UUID,
    "vinculadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" UUID NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "numeroDocumentoCifrado" TEXT NOT NULL,
    "documentoIndiceCiego" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "nacionalidad" TEXT NOT NULL,
    "fechaNacimientoCifrada" TEXT,
    "sexoDeclarado" TEXT,
    "institucion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consentimiento" (
    "id" UUID NOT NULL,
    "personaId" UUID NOT NULL,
    "versionTexto" TEXT NOT NULL,
    "fechaFirma" TIMESTAMP(3) NOT NULL,
    "entidadRevisora" TEXT NOT NULL,
    "archivoNombre" TEXT NOT NULL,
    "archivoSha256" TEXT NOT NULL,
    "archivo" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consentimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TomaMuestra" (
    "id" UUID NOT NULL,
    "stickerId" UUID NOT NULL,
    "personaId" UUID NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "lugar" TEXT NOT NULL,
    "operadorId" UUID NOT NULL,
    "observaciones" TEXT,
    "dedosNoObtenibles" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TomaMuestra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Huella" (
    "id" UUID NOT NULL,
    "stickerId" UUID NOT NULL,
    "posicion" INTEGER NOT NULL,
    "archivoNombre" TEXT NOT NULL,
    "mimeOriginal" TEXT NOT NULL,
    "imagenOriginal" BYTEA NOT NULL,
    "imagenPng" BYTEA NOT NULL,
    "sha256Imagen" TEXT NOT NULL,
    "dpi" INTEGER NOT NULL,
    "origen" "OrigenHuella" NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "plantilla" BYTEA NOT NULL,
    "sha256Plantilla" TEXT NOT NULL,
    "cantidadMinucias" INTEGER NOT NULL,
    "minucias" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Huella_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoincidenciaHuella" (
    "id" UUID NOT NULL,
    "huellaId" UUID NOT NULL,
    "candidataId" UUID NOT NULL,
    "puntaje" DOUBLE PRECISION NOT NULL,
    "umbral" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoincidenciaHuella_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MuestraBiologica" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "stickerId" UUID NOT NULL,
    "laboratorio" TEXT NOT NULL,
    "estadoSello" TEXT NOT NULL,
    "etapaActual" "TipoEvento" NOT NULL,
    "etapaDesde" TIMESTAMP(3) NOT NULL,
    "adnUgMl" DOUBLE PRECISION,
    "kit" TEXT,
    "loteKit" TEXT,
    "equipos" TEXT,
    "tubosAlmacenados" INTEGER,
    "materialRestante" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MuestraBiologica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilGenetico" (
    "id" UUID NOT NULL,
    "stickerId" UUID NOT NULL,
    "codigoMuestra" TEXT NOT NULL,
    "marcadores" JSONB NOT NULL,
    "kit" TEXT NOT NULL,
    "formatoOrigen" TEXT NOT NULL,
    "archivoId" UUID NOT NULL,
    "archivoSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerfilGenetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoAdjunto" (
    "id" UUID NOT NULL,
    "stickerId" UUID,
    "etapa" "TipoEvento",
    "nombre" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "interpretado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoAdjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoCustodia" (
    "id" UUID NOT NULL,
    "stickerId" UUID NOT NULL,
    "secuencia" INTEGER NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "responsableId" UUID NOT NULL,
    "responsableNombre" TEXT NOT NULL,
    "detalle" JSONB NOT NULL,
    "archivoSha256" TEXT,
    "hashAnterior" TEXT NOT NULL,
    "hashEvento" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoCustodia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VinculoDactilogenetico" (
    "id" UUID NOT NULL,
    "stickerId" UUID NOT NULL,
    "personaId" UUID NOT NULL,
    "documento" TEXT NOT NULL,
    "documentoSha256" TEXT NOT NULL,
    "firma" TEXT NOT NULL,
    "llavePublica" TEXT NOT NULL,
    "estado" "EstadoVinculo" NOT NULL DEFAULT 'VIGENTE',
    "firmadoPorId" UUID NOT NULL,
    "firmadoEn" TIMESTAMP(3) NOT NULL,
    "revocadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VinculoDactilogenetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "usuarioNombre" TEXT,
    "rol" TEXT,
    "accion" TEXT NOT NULL,
    "recurso" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "exito" BOOLEAN NOT NULL DEFAULT true,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaSticker_nombre_key" ON "PlantillaSticker"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Kit_nombre_key" ON "Kit"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_codigo_key" ON "Lote"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Sticker_codigo_key" ON "Sticker"("codigo");

-- CreateIndex
CREATE INDEX "Sticker_estado_idx" ON "Sticker"("estado");

-- CreateIndex
CREATE INDEX "Sticker_loteId_idx" ON "Sticker"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_documentoIndiceCiego_key" ON "Persona"("documentoIndiceCiego");

-- CreateIndex
CREATE UNIQUE INDEX "TomaMuestra_stickerId_key" ON "TomaMuestra"("stickerId");

-- CreateIndex
CREATE UNIQUE INDEX "Huella_stickerId_posicion_key" ON "Huella"("stickerId", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "MuestraBiologica_codigo_key" ON "MuestraBiologica"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "MuestraBiologica_stickerId_key" ON "MuestraBiologica"("stickerId");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilGenetico_stickerId_key" ON "PerfilGenetico"("stickerId");

-- CreateIndex
CREATE UNIQUE INDEX "EventoCustodia_hashEvento_key" ON "EventoCustodia"("hashEvento");

-- CreateIndex
CREATE INDEX "EventoCustodia_fecha_idx" ON "EventoCustodia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "EventoCustodia_stickerId_secuencia_key" ON "EventoCustodia"("stickerId", "secuencia");

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "Auditoria"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_accion_idx" ON "Auditoria"("accion");

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaSticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TomaMuestra" ADD CONSTRAINT "TomaMuestra_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TomaMuestra" ADD CONSTRAINT "TomaMuestra_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TomaMuestra" ADD CONSTRAINT "TomaMuestra_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Huella" ADD CONSTRAINT "Huella_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoincidenciaHuella" ADD CONSTRAINT "CoincidenciaHuella_huellaId_fkey" FOREIGN KEY ("huellaId") REFERENCES "Huella"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoincidenciaHuella" ADD CONSTRAINT "CoincidenciaHuella_candidataId_fkey" FOREIGN KEY ("candidataId") REFERENCES "Huella"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuestraBiologica" ADD CONSTRAINT "MuestraBiologica_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilGenetico" ADD CONSTRAINT "PerfilGenetico_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilGenetico" ADD CONSTRAINT "PerfilGenetico_archivoId_fkey" FOREIGN KEY ("archivoId") REFERENCES "ArchivoAdjunto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoAdjunto" ADD CONSTRAINT "ArchivoAdjunto_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCustodia" ADD CONSTRAINT "EventoCustodia_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoCustodia" ADD CONSTRAINT "EventoCustodia_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoDactilogenetico" ADD CONSTRAINT "VinculoDactilogenetico_stickerId_fkey" FOREIGN KEY ("stickerId") REFERENCES "Sticker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoDactilogenetico" ADD CONSTRAINT "VinculoDactilogenetico_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoDactilogenetico" ADD CONSTRAINT "VinculoDactilogenetico_firmadoPorId_fkey" FOREIGN KEY ("firmadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Cadena de custodia inviolable: EventoCustodia es de solo inserción.
-- Ni la API ni alguien con acceso directo a la base puede editar o borrar eventos.
-- =====================================================================
CREATE OR REPLACE FUNCTION custodia_solo_insercion() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La cadena de custodia es de solo inserción: % no está permitido sobre EventoCustodia', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custodia_bloquea_update_delete
  BEFORE UPDATE OR DELETE ON "EventoCustodia"
  FOR EACH ROW EXECUTE FUNCTION custodia_solo_insercion();

CREATE TRIGGER custodia_bloquea_truncate
  BEFORE TRUNCATE ON "EventoCustodia"
  FOR EACH STATEMENT EXECUTE FUNCTION custodia_solo_insercion();

-- Correlativo de muestras biológicas (M-000001, M-000002, …).
CREATE SEQUENCE muestra_correlativo START 1;
