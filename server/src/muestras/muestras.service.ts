import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ErrorPerfil, Marcadores, comparar, resumir } from '../genetica/str';
import { NOMBRE_FORMATO, leerArchivo } from '../genetica/lectores';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MuestrasService {
  constructor(private readonly prisma: PrismaService) {}

  async analizar(nombreArchivo: string, datos: Buffer) {
    let leido;
    try {
      leido = await leerArchivo(nombreArchivo, datos);
    } catch (error) {
      if (error instanceof ErrorPerfil) throw new BadRequestException(error.message);
      throw error;
    }

    const registrados = await this.perfilesRegistrados();

    return {
      archivo: {
        nombre: nombreArchivo,
        tamanoBytes: datos.length,
        sha256: createHash('sha256').update(datos).digest('hex'),
        formato: leido.formato,
        formatoNombre: NOMBRE_FORMATO[leido.formato],
        encabezado: leido.encabezado,
      },
      muestras: leido.muestras.map((m) => ({
        codigoMuestra: m.codigoMuestra,
        metadatos: m.metadatos,
        marcadoresSTR: m.marcadores,
        resumen: resumir(m.marcadores),
        coincidencias: this.buscar(m.marcadores, registrados),
      })),
    };
  }

  // Busca el perfil en el registro. Coincidencia = todos los loci comunes iguales (mínimo 10).
  buscar(marcadores: Marcadores, registrados: Awaited<ReturnType<MuestrasService['perfilesRegistrados']>>) {
    return registrados
      .map((r) => ({ ...r, comparacion: comparar(marcadores, r.marcadores) }))
      .filter((r) => r.comparacion.exacta)
      .map((r) => ({
        personaId: r.personaId,
        nombreCompleto: r.nombreCompleto,
        identificador: r.identificador,
        codigoMuestra: r.codigoMuestra,
        lociComparados: r.comparacion.lociComparados,
      }));
  }

  async perfilesRegistrados() {
    const perfiles = await this.prisma.perfilGenetico.findMany({
      select: {
        codigoMuestra: true,
        marcadoresSTR: true,
        persona: { select: { id: true, nombreCompleto: true, identificador: true } },
      },
    });
    return perfiles.map((p) => ({
      personaId: p.persona.id,
      nombreCompleto: p.persona.nombreCompleto,
      identificador: p.persona.identificador,
      codigoMuestra: p.codigoMuestra,
      marcadores: p.marcadoresSTR as Marcadores,
    }));
  }
}
