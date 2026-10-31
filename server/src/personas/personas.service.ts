import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ImportarPersonaDto } from './dto/importar-persona.dto';

const MARKER_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,30}$/;
const ALLELE = /^[A-Za-z0-9.]{1,10}$/;

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async importar(dto: ImportarPersonaDto) {
    const marcadoresSTR = this.normalizarMarcadores(dto.perfilGenetico.marcadoresSTR);
    const alertasClinicas = this.normalizarAlertas(dto.alertasClinicas);
    const fechaNacimiento = this.parseFecha(dto.fechaNacimiento);
    const codigoMuestra = dto.perfilGenetico.codigoMuestra?.trim() || null;

    try {
      const persona = await this.prisma.$transaction((tx) =>
        tx.persona.create({
          data: {
            nombreCompleto: dto.nombreCompleto,
            identificador: dto.identificador,
            fechaNacimiento,
            alertasClinicas: alertasClinicas ?? undefined,
            perfilGenetico: {
              create: {
                codigoMuestra,
                marcadoresSTR,
              },
            },
            ...(dto.huellaDactilar
              ? {
                  huellaDactilar: {
                    create: {
                      referenciaSimulada: dto.huellaDactilar.referenciaSimulada?.trim() || null,
                      estado: dto.huellaDactilar.estado,
                    },
                  },
                }
              : {}),
          },
        }),
      );

      return {
        id: persona.id,
        nombreCompleto: persona.nombreCompleto,
        identificador: persona.identificador,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe una persona con ese identificador.');
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
      },
    });

    return personas.map(({ qrTokenHash, ...persona }) => ({
      ...persona,
      tieneQr: qrTokenHash !== null,
    }));
  }

  async generarQr(id: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!persona) {
      throw new NotFoundException('No existe la persona solicitada.');
    }

    const base = (process.env.READER_BASE_URL?.trim() || 'http://localhost:5174').replace(/\/$/, '');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = randomBytes(32).toString('base64url');
      const qrTokenHash = this.hashToken(token);

      try {
        await this.prisma.persona.update({
          where: { id },
          data: { qrTokenHash },
        });
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
      include: {
        perfilGenetico: true,
        huellaDactilar: true,
      },
    });

    if (!persona?.perfilGenetico) {
      throw new NotFoundException('El código QR no es válido o el expediente no existe.');
    }

    return {
      nombreCompleto: persona.nombreCompleto,
      identificador: persona.identificador,
      fechaNacimiento: persona.fechaNacimiento ? persona.fechaNacimiento.toISOString().slice(0, 10) : null,
      alertasClinicas: persona.alertasClinicas,
      perfilGenetico: {
        codigoMuestra: persona.perfilGenetico.codigoMuestra,
        marcadoresSTR: persona.perfilGenetico.marcadoresSTR,
      },
      huellaDactilar: persona.huellaDactilar
        ? {
            referenciaSimulada: persona.huellaDactilar.referenciaSimulada,
            estado: persona.huellaDactilar.estado,
          }
        : null,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private normalizarMarcadores(value: Record<string, unknown>): Prisma.InputJsonObject {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      throw new BadRequestException('Debe incluir al menos un marcador STR.');
    }
    if (entries.length > 40) {
      throw new BadRequestException('Se pueden registrar hasta 40 marcadores STR.');
    }

    const marcadores: Record<string, string[]> = {};

    for (const [marker, alleles] of entries) {
      if (marker === '__proto__' || marker === 'constructor' || marker === 'prototype' || !MARKER_NAME.test(marker)) {
        throw new BadRequestException(`Marcador inválido: ${marker}`);
      }
      if (!Array.isArray(alleles) || alleles.length === 0 || alleles.length > 4) {
        throw new BadRequestException(`El marcador ${marker} debe tener entre 1 y 4 alelos.`);
      }

      const normalizados = alleles.map((allele) => {
        if (typeof allele !== 'string' || !ALLELE.test(allele.trim())) {
          throw new BadRequestException(
            `Los alelos de ${marker} deben ser texto, por ejemplo "15" o "9.3".`,
          );
        }
        return allele.trim();
      });

      marcadores[marker] = normalizados;
    }

    return marcadores as Prisma.InputJsonObject;
  }

  private normalizarAlertas(alertas?: ImportarPersonaDto['alertasClinicas']): Prisma.InputJsonObject | undefined {
    if (!alertas) {
      return undefined;
    }

    const alergias = (alertas.alergias ?? []).map((item) => item.trim()).filter(Boolean);
    const observaciones = alertas.observaciones?.trim() ?? '';

    if (alergias.some((item) => item.length > 80)) {
      throw new BadRequestException('Cada alergia puede tener hasta 80 caracteres.');
    }

    if (alergias.length === 0 && !observaciones) {
      return undefined;
    }

    return {
      ...(alergias.length ? { alergias } : {}),
      ...(observaciones ? { observaciones } : {}),
    };
  }

  private parseFecha(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

    if (!valid) {
      throw new BadRequestException('La fecha de nacimiento no es válida.');
    }

    return date;
  }
}
