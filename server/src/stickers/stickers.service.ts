import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSticker, Prisma } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Ctx } from '../common/sesion';
import { ETAPAS_LAB, ORDEN_ESTADO } from '../common/dominio';
import { PATRON_CODIGO, codigoSticker, normalizarCodigo } from '../cripto/cripto';
import { CriptoService } from '../cripto/cripto.service';
import { CustodiaService } from '../custodia/custodia.service';
import { PrismaService } from '../prisma/prisma.service';
import { CrearLoteDto } from './dto/lote.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class StickersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cripto: CriptoService,
    private readonly custodia: CustodiaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ------------------------------------------------------------ Lotes

  async crearLote(dto: CrearLoteDto, ctx: Ctx) {
    const plantilla = await this.prisma.plantillaSticker.findUnique({ where: { id: dto.plantillaId } });
    if (!plantilla) throw new BadRequestException('La plantilla de sticker no existe.');
    const fecha = ctx.fecha ?? new Date();
    const n = await this.prisma.lote.count();
    const codigo = `L-${fecha.getFullYear()}-${String(n + 1).padStart(3, '0')}`;

    const lote = await this.prisma.$transaction(
      async (tx) => {
        const lote = await tx.lote.create({
          data: {
            codigo,
            plantillaId: plantilla.id,
            cantidad: dto.cantidad,
            fechaFabricacion: new Date(dto.fechaFabricacion),
            versionDiseno: dto.versionDiseno,
            fabrica: dto.fabrica,
            creadoPorId: ctx.usuario.id,
            ...(ctx.fecha ? { createdAt: ctx.fecha } : {}),
          },
        });
        const usados = new Set<string>();
        for (let i = 0; i < dto.cantidad; i++) {
          let c = codigoSticker();
          while (usados.has(c) || (await tx.sticker.findUnique({ where: { codigo: c }, select: { id: true } }))) {
            c = codigoSticker();
          }
          usados.add(c);
          const s = await tx.sticker.create({
            data: { codigo: c, loteId: lote.id, ...(ctx.fecha ? { createdAt: ctx.fecha } : {}) },
          });
          await this.custodia.agregar(tx, {
            stickerId: s.id,
            tipo: 'FABRICACION',
            ctx,
            detalle: {
              lote: lote.codigo,
              plantilla: plantilla.nombre,
              versionDiseno: dto.versionDiseno,
              fabrica: dto.fabrica,
              fechaFabricacion: dto.fechaFabricacion.slice(0, 10),
            },
          });
        }
        return lote;
      },
      { timeout: 120_000 },
    );
    await this.auditoria.registrar(ctx, 'CREAR_LOTE', { recurso: lote.codigo, detalle: { cantidad: dto.cantidad } });
    return this.lote(lote.id);
  }

  async eliminarLote(id: string, ctx: Ctx) {
    const lote = await this.prisma.lote.findUnique({
      where: { id },
      select: { id: true, codigo: true, stickers: { select: { id: true, personaId: true } } },
    });
    if (!lote) throw new NotFoundException('El lote no existe.');
    await this.prisma.$transaction(async (tx) => {
      await this.borrarStickers(tx, lote.stickers.map((s) => s.id));
      await tx.lote.delete({ where: { id } });
    });
    await this.auditoria.registrar(ctx, 'ELIMINAR_LOTE', {
      recurso: lote.codigo,
      detalle: { stickers: lote.stickers.length, personasConservadas: new Set(lote.stickers.map((s) => s.personaId).filter(Boolean)).size },
    });
    return { ok: true as const, codigo: lote.codigo };
  }

  async eliminarSticker(codigo: string, ctx: Ctx) {
    const sticker = await this.prisma.sticker.findUnique({
      where: { codigo: normalizarCodigo(codigo) },
      select: { id: true, codigo: true, personaId: true },
    });
    if (!sticker) throw new NotFoundException('El sticker no existe.');
    await this.prisma.$transaction((tx) => this.borrarStickers(tx, [sticker.id]));
    await this.auditoria.registrar(ctx, 'ELIMINAR_STICKER', { recurso: sticker.codigo, detalle: { personaConservada: Boolean(sticker.personaId) } });
    return { ok: true as const, codigo: sticker.codigo };
  }

  // Borra el sticker y lo que cuelga de él. La persona y su consentimiento se conservan.
  private async borrarStickers(tx: Tx, ids: string[]) {
    if (!ids.length) return;
    await tx.$executeRaw`SELECT set_config('trazagen.borrar_lote', '1', true)`;
    const huellas = await tx.huella.findMany({ where: { stickerId: { in: ids } }, select: { id: true } });
    const huellaIds = huellas.map((h) => h.id);
    if (huellaIds.length) {
      await tx.coincidenciaHuella.deleteMany({ where: { OR: [{ huellaId: { in: huellaIds } }, { candidataId: { in: huellaIds } }] } });
      await tx.huella.deleteMany({ where: { id: { in: huellaIds } } });
    }
    await tx.perfilGenetico.deleteMany({ where: { stickerId: { in: ids } } });
    await tx.archivoAdjunto.deleteMany({ where: { stickerId: { in: ids } } });
    await tx.tomaMuestra.deleteMany({ where: { stickerId: { in: ids } } });
    await tx.muestraBiologica.deleteMany({ where: { stickerId: { in: ids } } });
    await tx.vinculoDactilogenetico.deleteMany({ where: { stickerId: { in: ids } } });
    await tx.eventoCustodia.deleteMany({ where: { stickerId: { in: ids } } });
    await tx.sticker.deleteMany({ where: { id: { in: ids } } });
  }

  async lotes() {
    const lotes = await this.prisma.lote.findMany({
      orderBy: { createdAt: 'desc' },
      include: { plantilla: true, creadoPor: { select: { nombre: true } }, stickers: { select: { estado: true } } },
    });
    return lotes.map(({ stickers, ...l }) => ({ ...l, porEstado: contarEstados(stickers.map((s) => s.estado)) }));
  }

  async lote(id: string) {
    const l = await this.prisma.lote.findUnique({
      where: { id },
      include: { plantilla: true, creadoPor: { select: { nombre: true } }, stickers: { orderBy: { createdAt: 'asc' } } },
    });
    if (!l) throw new NotFoundException('El lote no existe.');
    return {
      ...l,
      stickers: l.stickers.map((s) => ({ id: s.id, codigo: s.codigo, estado: s.estado, url: this.cripto.urlQr(s.codigo) })),
    };
  }

  async csvLote(id: string, ctx: Ctx) {
    const l = await this.lote(id);
    await this.auditoria.registrar(ctx, 'DESCARGAR_CSV_LOTE', { recurso: l.codigo });
    const filas = ['codigo,url,lote,plantilla,version_diseno', ...l.stickers.map((s) => [s.codigo, s.url, l.codigo, `"${l.plantilla.nombre}"`, l.versionDiseno].join(','))];
    return { nombre: `${l.codigo}.csv`, contenido: filas.join('\r\n') + '\r\n' };
  }

  // ------------------------------------------------------------ Stickers

  async listar(f: { estado?: string; lote?: string; pais?: string; q?: string }) {
    const where: Prisma.StickerWhereInput = {};
    if (f.estado && (ORDEN_ESTADO as string[]).includes(f.estado)) where.estado = f.estado as EstadoSticker;
    if (f.lote) where.lote = { codigo: f.lote };
    if (f.pais) where.lote = { ...(where.lote as object), plantilla: { pais: f.pais } };
    if (f.q) where.codigo = { contains: normalizarCodigo(f.q).slice(0, 12), mode: 'insensitive' };
    const items = await this.prisma.sticker.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
      include: {
        lote: { select: { codigo: true, plantilla: { select: { nombre: true, pais: true } } } },
        persona: { select: { id: true } },
        _count: { select: { huellas: true } },
        perfil: { select: { id: true } },
        muestra: { select: { codigo: true, etapaActual: true } },
        vinculos: { where: { estado: 'VIGENTE' }, select: { id: true } },
      },
    });
    const [lotes, paises] = await Promise.all([
      this.prisma.lote.findMany({ select: { codigo: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.plantillaSticker.findMany({ select: { pais: true }, distinct: ['pais'] }),
    ]);
    return {
      items: items.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        estado: s.estado,
        lote: s.lote.codigo,
        plantilla: s.lote.plantilla.nombre,
        pais: s.lote.plantilla.pais,
        tienePersona: Boolean(s.persona),
        huellas: s._count.huellas,
        tienePerfil: Boolean(s.perfil),
        muestra: s.muestra?.codigo ?? null,
        etapa: s.muestra?.etapaActual ?? null,
        vinculado: s.vinculos.length > 0,
        actualizado: s.updatedAt,
      })),
      filtros: { lotes: lotes.map((l) => l.codigo), paises: paises.map((p) => p.pais) },
    };
  }

  async porCodigo(codigo: string) {
    const s = await this.prisma.sticker.findUnique({ where: { codigo: normalizarCodigo(codigo) } });
    if (!s) throw new NotFoundException('No existe un sticker con ese código.');
    return s;
  }

  // Recalcula el estado del ciclo de vida a partir de los hechos registrados. Nunca retrocede.
  async actualizarEstado(tx: Tx, stickerId: string) {
    const s = await tx.sticker.findUniqueOrThrow({
      where: { id: stickerId },
      include: { toma: { select: { id: true } }, muestra: true, _count: { select: { huellas: true } } },
    });
    let nuevo: EstadoSticker = 'NUEVO';
    if (s.toma && s._count.huellas > 0) nuevo = 'PROCESADO';
    if (s.muestra && ETAPAS_LAB.indexOf(s.muestra.etapaActual) >= ETAPAS_LAB.indexOf('EXTRACCION')) nuevo = 'EN_USO';
    if (s.muestra && !s.muestra.materialRestante) nuevo = 'FINALIZADO';
    if (ORDEN_ESTADO.indexOf(nuevo) > ORDEN_ESTADO.indexOf(s.estado)) {
      await tx.sticker.update({ where: { id: stickerId }, data: { estado: nuevo } });
    }
    return nuevo;
  }

  // ------------------------------------------------------------ QR

  // Acepta la URL completa del QR, "codigo.firma" o un código escrito a mano.
  async resolverQr(texto: string, ctx: Ctx) {
    const t = texto.trim();
    let codigo: string;
    let firma: string | null = null;
    const m = t.match(/(?:\/s\/)?(TG-[0-9A-Za-z]{4}-[0-9A-Za-z]{4})(?:\.([A-Za-z0-9_-]{20,200}))?\/?$/);
    if (m) {
      codigo = m[1].toUpperCase();
      firma = m[2] ?? null;
    } else {
      codigo = normalizarCodigo(t);
    }

    const falso = async (motivo: string) => {
      await this.auditoria.registrar(ctx, 'QR_FALSO', {
        recurso: PATRON_CODIGO.test(codigo) ? codigo : undefined,
        detalle: { motivo, entrada: t.slice(0, 160) },
        exito: false,
      });
      return { valido: false as const, motivo, codigo: PATRON_CODIGO.test(codigo) ? codigo : null };
    };

    if (!PATRON_CODIGO.test(codigo)) return falso('El contenido no tiene el formato de un código TrazaGen.');
    if (firma !== null && !this.cripto.verificarFirmaQr(codigo, firma)) {
      return falso('La firma digital del QR no es válida.');
    }
    const s = await this.prisma.sticker.findUnique({
      where: { codigo },
      select: { id: true, codigo: true, estado: true, personaId: true },
    });
    if (!s) return falso('El código no corresponde a ningún sticker fabricado por TrazaGen.');

    await this.auditoria.registrar(ctx, 'ESCANEO_QR', {
      recurso: codigo,
      detalle: { firmaVerificada: firma !== null, estado: s.estado },
    });
    return {
      valido: true as const,
      codigo: s.codigo,
      estado: s.estado,
      vinculado: Boolean(s.personaId),
      firmaVerificada: firma !== null,
    };
  }
}

export function contarEstados(estados: EstadoSticker[]) {
  const r: Record<EstadoSticker, number> = { NUEVO: 0, PROCESADO: 0, EN_USO: 0, FINALIZADO: 0 };
  for (const e of estados) r[e]++;
  return r;
}
