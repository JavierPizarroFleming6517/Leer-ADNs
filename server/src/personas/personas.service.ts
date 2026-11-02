import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { ErrorPerfil, Marcadores, alelosUnicos, nombreLocus, ordenarMarcadores, resumir } from '../genetica/str';
import { NOMBRE_FORMATO, Formato } from '../genetica/lectores';
import { MuestrasService } from '../muestras/muestras.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImportarPersonaDto } from './dto/importar-persona.dto';

@Injectable()
export class PersonasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly muestras: MuestrasService,
  ) {}

  async importar(dto: ImportarPersonaDto) {
    const marcadoresSTR = this.normalizarMarcadores(dto.perfilGenetico.marcadoresSTR);
    const fechaNacimiento = this.parseFecha(dto.fechaNacimiento);

    // Un mismo perfil no puede quedar a nombre de dos personas.
    const coincidencias = this.muestras.buscar(marcadoresSTR, await this.muestras.perfilesRegistrados());
    if (coincidencias.length) {
      const c = coincidencias[0];
      throw new ConflictException(
        `Este perfil genético ya está registrado a nombre de ${c.nombreCompleto} (${c.identificador}).`,
      );
    }

    try {
      const persona = await this.prisma.persona.create({
        data: {
          nombreCompleto: dto.nombreCompleto,
          identificador: dto.identificador,
          fechaNacimiento,
          nacionalidad: dto.nacionalidad || null,
          perfilGenetico: {
            create: {
              codigoMuestra: dto.perfilGenetico.codigoMuestra,
              marcadoresSTR,
              formatoOrigen: dto.perfilGenetico.formatoOrigen ?? null,
              archivoOrigen: dto.perfilGenetico.archivoOrigen ?? null,
              hashArchivo: dto.perfilGenetico.hashArchivo ?? null,
            },
          },
          // La huella dactilar es simulada en la demo: se crea una referencia ficticia.
          huellaDactilar: {
            create: {
              referenciaSimulada: `SIM-${randomBytes(3).toString('hex').toUpperCase()}`,
              estado: 'simulada',
            },
          },
        },
      });

      return { id: persona.id, nombreCompleto: persona.nombreCompleto, identificador: persona.identificador };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe una persona con ese documento.');
      }
      throw error;
    }
  }

  async listar() {
    const personas = await this.prisma.persona.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombreCompleto: true,
        identificador: true,
        qrTokenHash: true,
        qrGeneradoEn: true,
        createdAt: true,
        perfilGenetico: { select: { codigoMuestra: true, marcadoresSTR: true, formatoOrigen: true } },
      },
    });

    return personas.map(({ qrTokenHash, perfilGenetico, ...persona }) => {
      const resumen = perfilGenetico ? resumir(perfilGenetico.marcadoresSTR as Marcadores) : null;
      return {
        ...persona,
        tieneQr: qrTokenHash !== null,
        codigoMuestra: perfilGenetico?.codigoMuestra ?? null,
        formatoOrigen: perfilGenetico?.formatoOrigen ?? null,
        codisPresentes: resumen?.codisPresentes ?? 0,
        totalLoci: resumen?.totalLoci ?? 0,
      };
    });
  }

  async generarQr(id: string) {
    const persona = await this.prisma.persona.findUnique({ where: { id }, select: { id: true } });
    if (!persona) {
      throw new NotFoundException('No existe la persona solicitada.');
    }

    const base = (process.env.READER_BASE_URL?.trim() || 'http://localhost:5174').replace(/\/$/, '');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = randomBytes(32).toString('base64url');
      const qrTokenHash = this.hashToken(token);

      try {
        await this.prisma.persona.update({ where: { id }, data: { qrTokenHash, qrGeneradoEn: new Date() } });
        return { url: `${base}/q/${token}` };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw new NotFoundException('No existe la persona solicitada.');
        }
        const duplicated =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && attempt === 0;
        if (!duplicated) {
          throw error;
        }
      }
    }

    throw new ConflictException('No se pudo generar el código QR. Inténtalo de nuevo.');
  }

  async resolver(token: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { qrTokenHash: this.hashToken(token.trim()) },
      include: { perfilGenetico: true, huellaDactilar: true },
    });

    if (!persona?.perfilGenetico) {
      throw new NotFoundException('El código QR no es válido o el expediente no existe.');
    }

    const marcadores = persona.perfilGenetico.marcadoresSTR as Marcadores;
    const formato = persona.perfilGenetico.formatoOrigen as Formato | null;

    return {
      nombreCompleto: persona.nombreCompleto,
      identificador: persona.identificador,
      fechaNacimiento: persona.fechaNacimiento ? persona.fechaNacimiento.toISOString().slice(0, 10) : null,
      nacionalidad: persona.nacionalidad,
      registradoEn: persona.createdAt.toISOString(),
      qrGeneradoEn: persona.qrGeneradoEn?.toISOString() ?? null,
      perfilGenetico: {
        codigoMuestra: persona.perfilGenetico.codigoMuestra,
        marcadoresSTR: marcadores,
        resumen: resumir(marcadores),
        formatoOrigen: formato ? NOMBRE_FORMATO[formato] : null,
        archivoOrigen: persona.perfilGenetico.archivoOrigen,
        hashArchivo: persona.perfilGenetico.hashArchivo,
      },
      huellaDactilar: persona.huellaDactilar
        ? { referenciaSimulada: persona.huellaDactilar.referenciaSimulada, estado: persona.huellaDactilar.estado }
        : null,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private normalizarMarcadores(value: Record<string, unknown>): Marcadores {
    const entries = Object.entries(value);
    if (entries.length === 0) throw new BadRequestException('Debe incluir al menos un marcador STR.');
    if (entries.length > 40) throw new BadRequestException('Se pueden registrar hasta 40 marcadores STR.');

    const marcadores: Marcadores = {};
    try {
      for (const [marker, alleles] of entries) {
        const locus = nombreLocus(marker);
        if (!Array.isArray(alleles) || alleles.length === 0 || alleles.length > 4) {
          throw new ErrorPerfil(`El marcador ${locus} debe tener entre 1 y 4 alelos.`);
        }
        marcadores[locus] = alelosUnicos(alleles, locus);
      }
    } catch (error) {
      if (error instanceof ErrorPerfil) throw new BadRequestException(error.message);
      throw error;
    }
    return ordenarMarcadores(marcadores);
  }

  private parseFecha(value?: string | null): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (!valid) throw new BadRequestException('La fecha de nacimiento no es válida.');
    return date;
  }
}
