import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      alertasClinicas: {
        alergias: ['Aspirina'],
        observaciones: 'Registro ficticio generado por el seed de demostración.',
      },
      perfilGenetico: {
        create: {
          codigoMuestra: 'LAB-SEED-001',
          marcadoresSTR: {
            D3S1358: ['15', '16'],
            vWA: ['17', '18'],
            FGA: ['21', '23'],
            D8S1179: ['13', '14'],
            D21S11: ['29', '31'],
            AMEL: ['X', 'X'],
          },
        },
      },
      huellaDactilar: {
        create: {
          referenciaSimulada: 'SIM-REF-0001',
          estado: 'simulada',
        },
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
