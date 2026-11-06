import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { DEDOS, puedeVerAlelos } from '../common/dominio';
import { Ctx } from '../common/sesion';
import { normalizarCodigo } from '../cripto/cripto';
import { CriptoService } from '../cripto/cripto.service';
import { CustodiaService, NOMBRE_EVENTO } from '../custodia/custodia.service';
import { Marcadores, ordenarMarcadores, resumir } from '../genetica/str';
import { NOMBRE_FORMATO, Formato } from '../genetica/lectores';
import { PersonasService } from '../personas/personas.service';
import { PrismaService } from '../prisma/prisma.service';
import { VinculosService } from '../vinculos/vinculos.service';

// Ficha (expediente) del sticker, proyectada según el rol de quien consulta.
@Injectable()
export class FichaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cripto: CriptoService,
    private readonly personas: PersonasService,
    private readonly custodia: CustodiaService,
    private readonly vinculos: VinculosService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async ficha(codigoBruto: string, ctx: Ctx) {
    const codigo = normalizarCodigo(codigoBruto);
    const rol = ctx.usuario.rol;
    const s = await this.prisma.sticker.findUnique({
      where: { codigo },
      include: {
        lote: { include: { plantilla: true } },
        persona: { include: { consentimientos: { orderBy: { createdAt: 'desc' }, select: { id: true, versionTexto: true, fechaFirma: true, entidadRevisora: true, archivoNombre: true, archivoSha256: true, createdAt: true } } } },
        toma: { include: { operador: { select: { nombre: true } } } },
        huellas: {
          orderBy: { posicion: 'asc' },
          select: {
            id: true, posicion: true, sha256Imagen: true, sha256Plantilla: true, dpi: true, origen: true, ancho: true, alto: true,
            cantidadMinucias: true, minucias: true, archivoNombre: true, createdAt: true,
            coincidencias: { select: { puntaje: true, candidata: { select: { posicion: true, sticker: { select: { codigo: true, persona: { select: { nombres: true, apellidos: true } } } } } } } },
            coincididaPor: { select: { puntaje: true, huella: { select: { posicion: true, sticker: { select: { codigo: true, persona: { select: { nombres: true, apellidos: true } } } } } } } },
          },
        },
        muestra: true,
        perfil: { include: { archivo: { select: { nombre: true } } } },
        adjuntos: { orderBy: { createdAt: 'asc' }, select: { id: true, nombre: true, etapa: true, sha256: true, tamano: true, interpretado: true, createdAt: true } },
        vinculos: { orderBy: { firmadoEn: 'desc' }, include: { firmadoPor: { select: { nombre: true } } } },
      },
    });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    await this.auditoria.registrar(ctx, 'CONSULTA_FICHA', { recurso: s.codigo });

    const eventos = await this.custodia.eventosDeSticker(s.id);
    const vigente = s.vinculos.find((v) => v.estado === 'VIGENTE');
    const verAlelos = puedeVerAlelos(rol);
    const marcadores = s.perfil ? ordenarMarcadores(s.perfil.marcadores as Marcadores) : null;

    return {
      sticker: {
        id: s.id,
        codigo: s.codigo,
        estado: s.estado,
        creado: s.createdAt,
        vinculadoEn: s.vinculadoEn,
        lote: { id: s.loteId, codigo: s.lote.codigo, fabrica: s.lote.fabrica, versionDiseno: s.lote.versionDiseno, fechaFabricacion: s.lote.fechaFabricacion },
        plantilla: { nombre: s.lote.plantilla.nombre, pais: s.lote.plantilla.pais, posiciones: s.lote.plantilla.posiciones },
      },
      qrUrl: this.cripto.urlQr(s.codigo),
      persona: s.persona ? this.personas.vista(s.persona, rol) : null,
      consentimientos: s.persona?.consentimientos ?? [],
      toma: s.toma
        ? {
            fechaHora: s.toma.fechaHora,
            lugar: s.toma.lugar,
            operador: s.toma.operador.nombre,
            observaciones: s.toma.observaciones,
            dedosNoObtenibles: s.toma.dedosNoObtenibles as { posicion: number; dedo: string; motivo: string }[],
          }
        : null,
      huellas: s.huellas.map((h) => ({
        id: h.id,
        posicion: h.posicion,
        dedo: DEDOS[h.posicion],
        sha256Imagen: h.sha256Imagen,
        sha256Plantilla: h.sha256Plantilla,
        dpi: h.dpi,
        origen: h.origen,
        ancho: h.ancho,
        alto: h.alto,
        archivoNombre: h.archivoNombre,
        cantidadMinucias: h.cantidadMinucias,
        minucias: h.minucias,
        creada: h.createdAt,
        duplicados: [
          ...h.coincidencias.map((c) => ({ sticker: c.candidata.sticker.codigo, dedo: DEDOS[c.candidata.posicion], puntaje: c.puntaje, persona: c.candidata.sticker.persona ? `${c.candidata.sticker.persona.nombres} ${c.candidata.sticker.persona.apellidos}` : null })),
          ...h.coincididaPor.map((c) => ({ sticker: c.huella.sticker.codigo, dedo: DEDOS[c.huella.posicion], puntaje: c.puntaje, persona: c.huella.sticker.persona ? `${c.huella.sticker.persona.nombres} ${c.huella.sticker.persona.apellidos}` : null })),
        ],
      })),
      muestra: s.muestra
        ? {
            codigo: s.muestra.codigo,
            laboratorio: s.muestra.laboratorio,
            estadoSello: s.muestra.estadoSello,
            etapa: s.muestra.etapaActual,
            etapaNombre: NOMBRE_EVENTO[s.muestra.etapaActual],
            etapaDesde: s.muestra.etapaDesde,
            adnUgMl: s.muestra.adnUgMl,
            kit: s.muestra.kit,
            loteKit: s.muestra.loteKit,
            equipos: s.muestra.equipos,
            tubosAlmacenados: s.muestra.tubosAlmacenados,
            materialRestante: s.muestra.materialRestante,
            recibida: s.muestra.createdAt,
          }
        : null,
      perfil: s.perfil
        ? {
            codigoMuestra: s.perfil.codigoMuestra,
            kit: s.perfil.kit,
            formato: NOMBRE_FORMATO[s.perfil.formatoOrigen as Formato] ?? s.perfil.formatoOrigen,
            archivoNombre: s.perfil.archivo.nombre,
            archivoId: verAlelos ? s.perfil.archivoId : null,
            archivoSha256: s.perfil.archivoSha256,
            cargado: s.perfil.createdAt,
            resumen: resumir(marcadores!),
            marcadores: verAlelos ? marcadores : null,
            alelosVisibles: verAlelos,
          }
        : null,
      adjuntos: s.adjuntos.map((a) => ({ ...a, etapaNombre: a.etapa ? NOMBRE_EVENTO[a.etapa] : null })),
      vinculo: vigente ? { ...this.vinculos.vista(vigente), firmadoPor: vigente.firmadoPor.nombre } : null,
      vinculosRevocados: s.vinculos.filter((v) => v.estado === 'REVOCADO').map((v) => ({ id: v.id, firmadoEn: v.firmadoEn, revocadoEn: v.revocadoEn, documentoSha256: v.documentoSha256 })),
      custodia: {
        total: eventos.length,
        ultimoHash: eventos.at(-1)?.hashEvento ?? null,
        eventos: eventos.map((e) => ({ ...e, nombre: NOMBRE_EVENTO[e.tipo] })),
      },
    };
  }
}
