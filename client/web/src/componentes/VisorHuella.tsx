import { useEffect, useState } from 'react';
import { blob } from '../api';
import type { Minucia } from '../tipos';
import { Spinner } from '../ui';

// Imagen de la huella con las minucias reales extraídas por SourceAFIS dibujadas encima.
export function VisorHuella({
  huellaId,
  dataUrl,
  ancho,
  alto,
  minucias,
  mostrar = true,
  className = '',
}: {
  huellaId?: string;
  dataUrl?: string | null;
  ancho: number;
  alto: number;
  minucias: Minucia[];
  mostrar?: boolean;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(dataUrl ?? null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (dataUrl) {
      setSrc(dataUrl);
      return;
    }
    if (!huellaId) return;
    let url: string | null = null;
    let vivo = true;
    blob(`/huellas/${huellaId}/imagen`)
      .then((b) => {
        url = URL.createObjectURL(b);
        if (vivo) setSrc(url);
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [huellaId, dataUrl]);

  const r = Math.max(4, Math.min(ancho, alto) / 55);
  const largo = r * 2.6;
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white ${className}`} style={{ aspectRatio: `${ancho} / ${alto}` }}>
      {src ? <img src={src} alt="Huella dactilar" className="absolute inset-0 h-full w-full object-contain" draggable={false} /> : null}
      {!src && !error ? (
        <div className="absolute inset-0 flex items-center justify-center text-ink-mute">
          <Spinner />
        </div>
      ) : null}
      {error ? <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-mute">Imagen no disponible</div> : null}
      {mostrar && src ? (
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {minucias.map((m, i) => {
            const color = m.type === 'BIFURCATION' ? '#16A34A' : '#1A7DB5';
            const x2 = m.x + Math.cos(m.direction) * largo;
            const y2 = m.y + Math.sin(m.direction) * largo;
            return (
              <g key={i} stroke={color} strokeWidth={Math.max(1.2, r / 3.2)} fill="none" opacity="0.95">
                {m.type === 'BIFURCATION' ? (
                  <rect x={m.x - r * 0.8} y={m.y - r * 0.8} width={r * 1.6} height={r * 1.6} rx={r * 0.2} />
                ) : (
                  <circle cx={m.x} cy={m.y} r={r * 0.85} />
                )}
                <line x1={m.x} y1={m.y} x2={x2} y2={y2} strokeLinecap="round" />
              </g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}

export function LeyendaMinucias({ total }: { total?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-mute">
      {total !== undefined ? <span className="font-semibold text-ink">{total} minucias</span> : null}
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 12 12" className="h-3 w-3">
          <circle cx="6" cy="6" r="4" stroke="#1A7DB5" strokeWidth="1.6" fill="none" />
        </svg>
        Terminación
      </span>
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 12 12" className="h-3 w-3">
          <rect x="2" y="2" width="8" height="8" stroke="#16A34A" strokeWidth="1.6" fill="none" />
        </svg>
        Bifurcación
      </span>
      <span>· la línea indica la dirección de la cresta</span>
    </div>
  );
}
