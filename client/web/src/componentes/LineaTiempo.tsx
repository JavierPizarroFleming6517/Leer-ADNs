import type { ReactNode } from 'react';
import type { Evento } from '../tipos';
import { NOMBRE_ETAPA } from '../tipos';
import { Hash, Icon, fecha } from '../ui';

const ICONOS: Record<string, (p: { className?: string }) => ReactNode> = {
  FABRICACION: Icon.box,
  TOMA: Icon.user,
  DIGITALIZACION_HUELLAS: Icon.fingerprint,
  ENVIO: Icon.arrowRight,
  RECEPCION_LAB: Icon.flask,
  EXTRACCION: Icon.flask,
  CUANTIFICACION: Icon.flask,
  AMPLIFICACION: Icon.dna,
  ELECTROFORESIS: Icon.dna,
  INTERPRETACION: Icon.eye,
  PERFIL_CARGADO: Icon.dna,
  VINCULO_FIRMADO: Icon.shield,
  VERIFICACION: Icon.badge,
};

function resumenDetalle(e: Evento): string {
  const d = e.detalle as Record<string, unknown>;
  switch (e.tipo) {
    case 'FABRICACION':
      return `Lote ${d.lote} · ${d.plantilla} · v${d.versionDiseno}`;
    case 'TOMA':
      return `${d.lugar}`;
    case 'DIGITALIZACION_HUELLAS': {
      const c = d.controlDuplicados as { posiblesDuplicados?: unknown[]; comparadas?: number } | undefined;
      return `${d.dedo} · ${d.minucias} minucias · ${d.origen === 'FOTO' ? 'foto' : 'escáner'} ${d.dpi} DPI${c?.posiblesDuplicados?.length ? ' · POSIBLE DUPLICADO' : ''}`;
    }
    case 'ENVIO':
      return `Destino: ${d.destino}`;
    case 'RECEPCION_LAB':
      return `Muestra ${d.codigoMuestra} · sello ${String(d.estadoSello).toLowerCase().replace('danado', 'dañado')}`;
    case 'CUANTIFICACION':
      return d.materialAgotado ? 'Material agotado' : `ADN ${d.adnUgMl} µg/ml`;
    case 'AMPLIFICACION':
      return d.materialAgotado ? 'Material agotado' : `Kit ${d.kit}${d.loteKit ? ` · lote ${d.loteKit}` : ''}`;
    case 'PERFIL_CARGADO':
      return `${d.formato} · ${d.codis} CODIS · kit ${d.kit}`;
    case 'VINCULO_FIRMADO':
      return `Ed25519 · ${d.huellas} huellas · muestra ${d.codigoMuestra}`;
    case 'VERIFICACION':
      return d.tipo === 'HUELLA_1_N'
        ? `Búsqueda por huella: ${d.dedo}, puntaje ${d.puntaje}`
        : d.tipo === 'PERFIL_STR'
          ? `Búsqueda por perfil STR: ${d.lociComparados} loci`
          : `Integridad del vínculo: ${d.resultado}`;
    default:
      if (d.materialAgotado) return 'Material agotado';
      return [d.metodo, d.equipos, d.software].filter(Boolean).join(' · ');
  }
}

export function LineaTiempo({ eventos, errores = [], mostrarSticker = false }: { eventos: Evento[] & { sticker?: { codigo: string } }[]; errores?: number[]; mostrarSticker?: boolean }) {
  return (
    <ol className="relative">
      {eventos.map((e, i) => {
        const I = ICONOS[e.tipo] ?? Icon.chain;
        const mal = errores.includes(e.secuencia);
        const alerta = e.tipo === 'VERIFICACION' && (e.detalle as { resultado?: string }).resultado === 'ALTERADO';
        return (
          <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < eventos.length - 1 ? <span className="absolute left-[19px] top-10 h-[calc(100%-32px)] w-0.5 bg-line" /> : null}
            <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${mal || alerta ? 'bg-red-100 text-red-700' : 'bg-celeste-50 text-celeste-700'}`}>
              <I className="h-5 w-5" />
            </span>
            <div className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${mal ? 'border-red-300 bg-red-50' : 'border-line bg-white'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-semibold">
                  <span className="mr-2 font-mono text-xs text-ink-mute">#{e.secuencia}</span>
                  {e.nombre ?? NOMBRE_ETAPA[e.tipo] ?? e.tipo}
                  {mostrarSticker && (e as unknown as { sticker?: { codigo: string } }).sticker ? (
                    <span className="ml-2 font-mono text-xs text-celeste-700">{(e as unknown as { sticker: { codigo: string } }).sticker.codigo}</span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-mute">{fecha(e.fecha)}</p>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                {resumenDetalle(e)} · <span className="text-ink-mute">{e.responsableNombre}</span>
              </p>
              <div className="mt-2 grid gap-x-4 gap-y-0.5 text-[11px] sm:grid-cols-2">
                <p className="truncate text-ink-mute">
                  Hash <Hash valor={e.hashEvento} corto />
                </p>
                <p className="truncate text-ink-mute">
                  Anterior <Hash valor={e.hashAnterior} corto />
                </p>
                {e.archivoSha256 ? (
                  <p className="truncate text-ink-mute sm:col-span-2">
                    Archivo <Hash valor={e.archivoSha256} corto />
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
