-- Laboratorio externo: TrazaGen ya no registra las etapas internas del laboratorio.
-- Registra el envío y el resultado (perfil) que devuelve el laboratorio.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoEvento" ADD VALUE 'MATERIAL_AGOTADO';
ALTER TYPE "TipoEvento" ADD VALUE 'ANULACION';

-- DropForeignKey
ALTER TABLE "MuestraBiologica" DROP CONSTRAINT "MuestraBiologica_stickerId_fkey";

-- AlterTable
ALTER TABLE "PerfilGenetico" ADD COLUMN     "laboratorio" TEXT,
ADD COLUMN     "materialRestante" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Sticker" ADD COLUMN     "anuladoEn" TIMESTAMP(3),
ADD COLUMN     "motivoAnulacion" TEXT;

-- DropTable
DROP TABLE "MuestraBiologica";


DROP SEQUENCE IF EXISTS muestra_correlativo;

-- =====================================================================
-- Custodia inviolable (reemplaza la excepción por variable de sesión de la
-- migración anterior: cualquiera con acceso a la base podía activarla).
-- Única excepción, verificada por la propia base: el evento de FABRICACION de
-- un sticker que nunca se usó (estado NUEVO, sin persona, sin anular y sin
-- ningún otro evento). Así se pueden eliminar lotes y stickers sin uso; todo lo
-- demás sigue siendo de solo inserción. UPDATE y TRUNCATE siempre se rechazan.
-- =====================================================================
CREATE OR REPLACE FUNCTION custodia_solo_insercion() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND TG_LEVEL = 'ROW' AND OLD.tipo = 'FABRICACION'
     AND NOT EXISTS (
       SELECT 1 FROM "EventoCustodia" e WHERE e."stickerId" = OLD."stickerId" AND e.id <> OLD.id
     )
     AND EXISTS (
       SELECT 1 FROM "Sticker" s
       WHERE s.id = OLD."stickerId" AND s.estado = 'NUEVO' AND s."personaId" IS NULL AND s."anuladoEn" IS NULL
     ) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'La cadena de custodia es de solo inserción: % no está permitido sobre EventoCustodia', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
