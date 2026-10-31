-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Persona" (
    "id" UUID NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "fechaNacimiento" DATE,
    "alertasClinicas" JSONB,
    "qrTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilGenetico" (
    "id" UUID NOT NULL,
    "personaId" UUID NOT NULL,
    "codigoMuestra" TEXT,
    "marcadoresSTR" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerfilGenetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuellaDactilar" (
    "id" UUID NOT NULL,
    "personaId" UUID NOT NULL,
    "referenciaSimulada" TEXT,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HuellaDactilar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_identificador_key" ON "Persona"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_qrTokenHash_key" ON "Persona"("qrTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilGenetico_personaId_key" ON "PerfilGenetico"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "HuellaDactilar_personaId_key" ON "HuellaDactilar"("personaId");

-- AddForeignKey
ALTER TABLE "PerfilGenetico" ADD CONSTRAINT "PerfilGenetico_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuellaDactilar" ADD CONSTRAINT "HuellaDactilar_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
