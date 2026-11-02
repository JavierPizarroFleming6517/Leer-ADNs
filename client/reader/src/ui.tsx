import type { ReactNode, SVGProps } from 'react';

export const PRODUCTO = 'Locus ID';
export const DESARROLLADOR = 'Vurp';

export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#0B2F45" />
      <path d="M13 8c0 8 14 8 14 16s-14 8-14 16" stroke="#38A9DB" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M27 8c0 8-14 8-14 16s14 8 14 16" stroke="#A3E635" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M15.5 13h9M15.5 27h9" stroke="#ADDDF3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Marca({ subtitulo, oscuro = false }: { subtitulo?: string; oscuro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <p className={`text-[15px] font-bold tracking-tight ${oscuro ? 'text-white' : 'text-ink'}`}>{PRODUCTO}</p>
        {subtitulo ? (
          <p className={`text-xs font-medium ${oscuro ? 'text-celeste-200' : 'text-ink-mute'}`}>{subtitulo}</p>
        ) : null}
      </div>
    </div>
  );
}

// Fondo de hélice con bandas, para paneles oscuros.
export function HeliceFondo({ className = '' }: { className?: string }) {
  const puntos = Array.from({ length: 28 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      {puntos.map((i) => {
        const y = 20 + i * 28;
        const fase = Math.sin(i * 0.45);
        const x1 = 200 - 110 * fase;
        const x2 = 200 + 110 * fase;
        return (
          <g key={i} opacity={0.25 + 0.5 * Math.abs(fase)}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="#ADDDF3" strokeWidth="1.5" opacity="0.35" />
            <circle cx={x1} cy={y} r="4.5" fill="#38A9DB" />
            <circle cx={x2} cy={y} r="4.5" fill="#A3E635" />
          </g>
        );
      })}
    </svg>
  );
}

type IconProps = SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const Icon = {
  upload: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  ),
  file: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  alert: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  ),
  qr: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  ),
  user: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  dna: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9M9 6h6M9 18h6" />
    </svg>
  ),
  fingerprint: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 11v3a8 8 0 0 1-1.5 4.7M8.5 7.5A5 5 0 0 1 17 11v1.5M7 11a5 5 0 0 1 .6-2.4M7 14.5V11M17 15.5a13 13 0 0 1-.9 4M4.6 8.5A8.5 8.5 0 0 1 20.5 11v1M4 13v-2M14.5 11a2.5 2.5 0 0 0-5 0v2.5a9 9 0 0 1-1.7 5.2" />
    </svg>
  ),
  copy: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </svg>
  ),
  download: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5M4 20h16" />
    </svg>
  ),
  external: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  ),
  code: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
    </svg>
  ),
  logout: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" />
    </svg>
  ),
  shield: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  x: (p: IconProps) => (
    <svg viewBox="0 0 24 24" {...base} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
};

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Aviso({
  tono,
  titulo,
  children,
}: {
  tono: 'ok' | 'alerta' | 'error' | 'info';
  titulo: string;
  children?: ReactNode;
}) {
  const estilos = {
    ok: 'border-lima-400/60 bg-lima-50 text-lima-800',
    alerta: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-celeste-200 bg-celeste-50 text-celeste-700',
  }[tono];
  const I = tono === 'ok' ? Icon.check : tono === 'info' ? Icon.shield : Icon.alert;
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 ${estilos}`}>
      <I className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">{titulo}</p>
        {children ? <div className="mt-0.5 opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}

export function Dato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-mute">{etiqueta}</dt>
      <dd className={`mt-0.5 text-sm font-semibold text-ink ${mono ? 'font-mono' : ''}`}>{valor}</dd>
    </div>
  );
}
