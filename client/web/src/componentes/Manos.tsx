import { type DragEvent, useRef, useState } from 'react';
import type { HuellaFicha } from '../tipos';
import { DEDOS } from '../tipos';
import { Icon, Spinner } from '../ui';
import { VisorHuella } from './VisorHuella';

const W = 280;
const H = 300;
const SW = 52;
const SH = 66;
// Mano derecha vista con la palma hacia abajo (pulgar a la izquierda). La izquierda es su reflejo.
const DERECHA: { dedo: number; x: number; y: number; base: [number, number] }[] = [
  { dedo: 0, x: 40, y: 150, base: [100, 222] },
  { dedo: 1, x: 90, y: 42, base: [108, 178] },
  { dedo: 2, x: 146, y: 14, base: [150, 172] },
  { dedo: 3, x: 200, y: 38, base: [190, 176] },
  { dedo: 4, x: 248, y: 96, base: [226, 190] },
];

export type EstadoCasilla = { cargando?: boolean; error?: string };

function Casilla({
  pos,
  x,
  y,
  huella,
  noObtenible,
  estado,
  seleccionada,
  habilitada,
  onArchivo,
  onSeleccionar,
}: {
  pos: number;
  x: number;
  y: number;
  huella?: HuellaFicha;
  noObtenible?: string;
  estado?: EstadoCasilla;
  seleccionada: boolean;
  habilitada: boolean;
  onArchivo: (pos: number, f: File) => void;
  onSeleccionar: (pos: number) => void;
}) {
  const [encima, setEncima] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const duplicada = Boolean(huella?.duplicados.length);
  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setEncima(false);
    const f = e.dataTransfer.files?.[0];
    if (f && habilitada && !huella && !noObtenible) onArchivo(pos, f);
  };
  const estilo = { left: `${((x - SW / 2) / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(SW / W) * 100}%`, height: `${(SH / H) * 100}%` };
  let clase = 'border-2 border-dashed border-celeste-200 bg-white hover:border-celeste-400 hover:bg-celeste-50';
  if (huella) clase = `border-2 ${duplicada ? 'border-red-500 ring-4 ring-red-100' : 'border-lima-400'} bg-white`;
  if (noObtenible) clase = 'border-2 border-dashed border-line bg-[repeating-linear-gradient(135deg,#F4F8FB,#F4F8FB_6px,#E7EEF4_6px,#E7EEF4_12px)]';
  if (encima) clase = 'border-2 border-celeste-600 bg-celeste-50 ring-4 ring-celeste-100';
  if (!habilitada && !huella && !noObtenible) clase = 'border-2 border-dashed border-line bg-white/60';
  return (
    <div className="absolute" style={estilo}>
      <button
        type="button"
        title={`${pos} · ${DEDOS[pos]}${noObtenible ? ` · no obtenible: ${noObtenible}` : ''}`}
        data-testid={`dedo-${pos}`}
        onClick={() => (huella ? onSeleccionar(pos) : habilitada && !noObtenible ? input.current?.click() : onSeleccionar(pos))}
        onDragOver={(e) => {
          e.preventDefault();
          if (habilitada && !huella) setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
        className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[45%_45%_38%_38%] transition ${clase} ${seleccionada ? 'outline outline-2 outline-offset-2 outline-celeste-600' : ''}`}
      >
        {huella ? (
          <VisorHuella huellaId={huella.id} ancho={huella.ancho} alto={huella.alto} minucias={huella.minucias} mostrar={false} className="h-full w-full rounded-none" />
        ) : estado?.cargando ? (
          <Spinner className="h-5 w-5 text-celeste-600" />
        ) : noObtenible ? (
          <span className="text-[10px] font-bold text-ink-mute">N/O</span>
        ) : (
          <Icon.plus className={`h-5 w-5 ${habilitada ? 'text-celeste-400' : 'text-line'}`} />
        )}
        <span className="absolute left-1 top-1 rounded bg-ink/80 px-1 font-mono text-[9px] font-bold leading-4 text-white">{pos}</span>
        {huella ? (
          <span className={`absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full ${duplicada ? 'bg-red-500' : 'bg-lima-400'}`}>
            {duplicada ? <Icon.alert className="h-2.5 w-2.5 text-white" /> : <Icon.check className="h-2.5 w-2.5 text-ink" />}
          </span>
        ) : null}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/tiff,.tif,.tiff"
        className="hidden"
        data-testid={`input-dedo-${pos}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(pos, f);
          e.target.value = '';
        }}
      />
      {estado?.error ? <p className="absolute left-1/2 top-full z-10 mt-1 w-40 -translate-x-1/2 rounded-lg bg-red-600 px-2 py-1 text-center text-[10px] font-semibold text-white shadow">{estado.error}</p> : null}
    </div>
  );
}

export function Manos({
  posiciones,
  huellas,
  noObtenibles,
  estados,
  seleccion,
  habilitada,
  onArchivo,
  onSeleccionar,
}: {
  posiciones: number[];
  huellas: HuellaFicha[];
  noObtenibles: Record<number, string>;
  estados: Record<number, EstadoCasilla>;
  seleccion: number | null;
  habilitada: boolean;
  onArchivo: (pos: number, f: File) => void;
  onSeleccionar: (pos: number) => void;
}) {
  const manos = [
    { nombre: 'Mano izquierda', espejo: true, pos: [6, 7, 8, 9, 10] },
    { nombre: 'Mano derecha', espejo: false, pos: [1, 2, 3, 4, 5] },
  ];
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {manos.map((m) => {
        const incluida = m.pos.some((p) => posiciones.includes(p));
        return (
          <div key={m.nombre} className={`flex flex-col items-center ${incluida ? '' : 'opacity-40'}`}>
            <div className="relative w-full max-w-[300px]" style={{ aspectRatio: `${W} / ${H}` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
                <g transform={m.espejo ? `translate(${W} 0) scale(-1 1)` : undefined} fill="#E7F1F8" stroke="#D6EEF9" strokeWidth="2">
                  {DERECHA.map((d) => (
                    <line key={d.dedo} x1={d.x} y1={d.y + SH - 8} x2={d.base[0]} y2={d.base[1]} stroke="#E7F1F8" strokeWidth="40" strokeLinecap="round" />
                  ))}
                  <path d="M92 172 C 130 150, 200 158, 236 182 C 250 214, 246 252, 226 276 C 190 300, 128 298, 100 274 C 84 248, 82 200, 92 172 Z" />
                </g>
              </svg>
              {DERECHA.map((d, i) => {
                const pos = m.pos[i];
                if (!posiciones.includes(pos)) return null;
                const x = m.espejo ? W - d.x : d.x;
                return (
                  <Casilla
                    key={pos}
                    pos={pos}
                    x={x}
                    y={d.y}
                    huella={huellas.find((h) => h.posicion === pos)}
                    noObtenible={noObtenibles[pos]}
                    estado={estados[pos]}
                    seleccionada={seleccion === pos}
                    habilitada={habilitada}
                    onArchivo={onArchivo}
                    onSeleccionar={onSeleccionar}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">
              {m.nombre}
              {incluida ? '' : ' · no incluida en la plantilla'}
            </p>
          </div>
        );
      })}
    </div>
  );
}
