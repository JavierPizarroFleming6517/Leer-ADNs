import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Persona y perfil 100 % ficticios (alelos inventados), con los 20 loci CODIS.
async function main() {
  const identificador = 'DEMO-SEED-001';
  const existing = await prisma.persona.findUnique({ where: { identificador } });

  if (existing) {
    console.log('La persona de demostración ya existe:', identificador);
    return;
  }

  await prisma.persona.create({
    data: {
      nombreCompleto: 'Ana Lucía Quinteros',
      identificador,
      fechaNacimiento: new Date('1985-03-22T00:00:00.000Z'),
      nacionalidad: 'Chilena',
      perfilGenetico: {
        create: {
          codigoMuestra: 'LAB-SEED-001',
          formatoOrigen: 'CMF_XML',
          archivoOrigen: 'seed (ficticio)',
          marcadoresSTR: {
            AMEL: ['X'],
            CSF1PO: ['10', '12'],
            D1S1656: ['12', '15.3'],
            D2S441: ['10', '14'],
            D2S1338: ['17', '23'],
            D3S1358: ['15', '16'],
            D5S818: ['11', '13'],
            D7S820: ['8', '10'],
            D8S1179: ['13', '14'],
            D10S1248: ['13', '15'],
            D12S391: ['18', '20'],
            D13S317: ['9', '12'],
            D16S539: ['11', '12'],
            D18S51: ['14', '17'],
            D19S433: ['13', '14.2'],
            D21S11: ['29', '31'],
            D22S1045: ['15', '16'],
            FGA: ['21', '23'],
            TH01: ['6', '9.3'],
            TPOX: ['8', '11'],
            vWA: ['17', '18'],
          },
        },
      },
      huellaDactilar: {
        create: { referenciaSimulada: 'SIM-REF-0001', estado: 'simulada' },
      },
    },
  });

  console.log('Persona de demostración creada:', identificador);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
