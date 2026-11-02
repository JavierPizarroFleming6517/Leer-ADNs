-- Datos de origen del perfil (formato del laboratorio y huella SHA-256 del archivo)
ALTER TABLE "PerfilGenetico" ADD COLUMN "formatoOrigen" TEXT;
ALTER TABLE "PerfilGenetico" ADD COLUMN "archivoOrigen" TEXT;
ALTER TABLE "PerfilGenetico" ADD COLUMN "hashArchivo" TEXT;

-- El registro es de identificación: se quitan las alertas clínicas
ALTER TABLE "Persona" DROP COLUMN "alertasClinicas";
ALTER TABLE "Persona" ADD COLUMN "nacionalidad" TEXT;
ALTER TABLE "Persona" ADD COLUMN "qrGeneradoEn" TIMESTAMP(3);
