import { useState } from 'react';
import { CODIS_20, type Marcadores, type Resumen } from './tipos';
import { Icon } from './ui';

export function Indicadores({ resumen }: { resumen: Resumen }) {
  const items = [
    { etiqueta: 'Loci CODIS', valor: `${resumen.codisPresentes}/20`, ok: resumen.completoCodis },
    { etiqueta: 'Loci totales', valor: String(resumen.totalLoci), ok: true },
    { etiqueta: 'Amelogenina', valor: resumen.sexo === 'sin dato' ? 'Sin dato' : resumen.sexo, ok: resumen.sexo !== 'sin dato' },
    { etiqueta: 'Homocigotos', valor: String(resumen.homocigotos), ok: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.etiqueta} className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">{i.etiqueta}</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-xl font-semibold text-ink">
            {i.valor}
            {i.ok ? null : <Icon.alert className="h-4 w-4 text-amber-500" />}
          </p>
        </div>
      ))}
    </div>
  );
}

export function GrillaMarcadores({ marcadores, resaltar = [] }: { marcadores: Marcadores; resaltar?: string[] }) {
  const faltantes = CODIS_20.filter((l) => !marcadores[l]);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Object.entries(marcadores).map(([locus, alelos]) => {
        const esCodis = CODIS_20.includes(locus);
        const esSexo = locus === 'AMEL';
        const marcado = resaltar.includes(locus);
        return (
          <div
            key={locus}
            className={`rounded-xl border px-3 py-2.5 transition ${
              marcado
                ? 'border-red-300 bg-red-50 ring-2 ring-red-100'
                : alelos.length > 2
                  ? 'border-amber-300 bg-amber-50'
                  : esSexo
                    ? 'border-celeste-200 bg-celeste-50'
                    : 'border-line bg-white hover:border-celeste-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-ink-soft">{esSexo ? 'Amelogenina' : locus}</p>
              {esCodis ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lima-400" title="Locus CODIS" /> : null}
            </div>
            <p className="mt-1 font-mono text-[15px] font-semibold text-ink">
              {alelos.length === 1 && !esSexo ? `${alelos[0]}, ${alelos[0]}` : alelos.join(', ')}
            </p>
          </div>
        );
      })}
      {faltantes.map((locus) => (
        <div key={locus} className="rounded-xl border border-dashed border-line px-3 py-2.5">
          <p className="text-xs font-semibold text-ink-mute">{locus}</p>
          <p className="mt-1 font-mono text-[15px] text-ink-mute">sin dato</p>
        </div>
      ))}
    </div>
  );
}

export function Leyenda() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink-mute">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-lima-400" /> Locus núcleo CODIS
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded border border-dashed border-ink-mute" /> Locus faltante
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded border border-amber-300 bg-amber-50" /> Más de 2 alelos (posible mezcla)
      </span>
    </div>
  );
}

export function VisorJson({ valor, titulo }: { valor: unknown; titulo: string }) {
  const [abierto, setAbierto] = useState(false);
  const texto = typeof valor === 'string' ? valor : JSON.stringify(valor, null, 2);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-celeste-50">
        <span className="flex items-center gap-2">
          <Icon.code className="h-4 w-4 text-celeste-600" />
          {titulo}
        </span>
        <span className="font-mono text-xs text-ink-mute">
          {(new Blob([texto]).size / 1024).toFixed(1)} KB · {abierto ? 'ocultar' : 'ver'}
        </span>
      </button>
      {abierto ? <pre className="max-h-96 overflow-auto bg-ink px-4 py-3 font-mono text-xs leading-5 text-celeste-100">{texto}</pre> : null}
    </div>
  );
}
