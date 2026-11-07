import { type ReactNode, type SVGProps, useEffect, useState } from 'react';

export const PRODUCTO = 'TrazaGen';
export const LEMA = 'Plataforma de identificación dactilogenética';
export const DESARROLLADOR = 'Vurp';

// Logo: a la izquierda, crestas de una huella; a la derecha, la doble hélice que las continúa.
export function Logo({ className = 'h-9 w-9', fondo = true }: { className?: string; fondo?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {fondo ? <rect width="40" height="40" rx="11" fill="#0B2F45" /> : null}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8A12 12 0 0 0 21 32" stroke="#38A9DB" strokeWidth="2.2" />
        <path d="M21 12.5A7.5 7.5 0 0 0 21 27.5" stroke="#38A9DB" strokeWidth="2.2" />
        <path d="M21 17A3 3 0 0 0 21 23" stroke="#ADDDF3" strokeWidth="2.2" />
        <path d="M22.46 11.00H29.54M29.54 17.00H22.46M29.54 23.00H22.46M22.46 29.00H29.54" stroke="#ADDDF3" strokeWidth="1.4" opacity=".7" />
        <path d="M31.00 8.00 L30.90 8.75 L30.62 9.50 L30.16 10.25 L29.54 11.00 L28.78 11.75 L27.91 12.50 L26.98 13.25 L26.00 14.00 L25.02 14.75 L24.09 15.50 L23.22 16.25 L22.46 17.00 L21.84 17.75 L21.38 18.50 L21.10 19.25 L21.00 20.00 L21.10 20.75 L21.38 21.50 L21.84 22.25 L22.46 23.00 L23.22 23.75 L24.09 24.50 L25.02 25.25 L26.00 26.00 L26.98 26.75 L27.91 27.50 L28.78 28.25 L29.54 29.00 L30.16 29.75 L30.62 30.50 L30.90 31.25 L31.00 32.00" stroke="#A3E635" strokeWidth="2.2" />
        <path d="M21.00 8.00 L21.10 8.75 L21.38 9.50 L21.84 10.25 L22.46 11.00 L23.22 11.75 L24.09 12.50 L25.02 13.25 L26.00 14.00 L26.98 14.75 L27.91 15.50 L28.78 16.25 L29.54 17.00 L30.16 17.75 L30.62 18.50 L30.90 19.25 L31.00 20.00 L30.90 20.75 L30.62 21.50 L30.16 22.25 L29.54 23.00 L28.78 23.75 L27.91 24.50 L26.98 25.25 L26.00 26.00 L25.02 26.75 L24.09 27.50 L23.22 28.25 L22.46 29.00 L21.84 29.75 L21.38 30.50 L21.10 31.25 L21.00 32.00" stroke="#38A9DB" strokeWidth="2.2" />
      </g>
    </svg>
  );
}

export function Marca({ oscuro = false, compacta = false }: { oscuro?: boolean; compacta?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo className={compacta ? 'h-8 w-8' : 'h-10 w-10'} />
      <div className="leading-tight">
        <p className={`text-[16px] font-bold tracking-tight ${oscuro ? 'text-white' : 'text-ink'}`}>{PRODUCTO}</p>
        {compacta ? null : <p className={`text-[11px] font-medium ${oscuro ? 'text-celeste-200' : 'text-ink-mute'}`}>{LEMA}</p>}
      </div>
    </div>
  );
}

// Fondo de hélice, para paneles oscuros.
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
const I = (d: ReactNode) => (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...base} {...p}>
    {d}
  </svg>
);

export const Icon = {
  upload: I(<path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />),
  file: I(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>),
  check: I(<path d="m5 12.5 4.5 4.5L19 7.5" />),
  alert: I(<path d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />),
  qr: I(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></>),
  scan: I(<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></>),
  user: I(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  users: I(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>),
  dna: I(<path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9M9 6h6M9 18h6" />),
  fingerprint: I(<path d="M12 11v3a8 8 0 0 1-1.5 4.7M8.5 7.5A5 5 0 0 1 17 11v1.5M7 11a5 5 0 0 1 .6-2.4M7 14.5V11M17 15.5a13 13 0 0 1-.9 4M4.6 8.5A8.5 8.5 0 0 1 20.5 11v1M4 13v-2M14.5 11a2.5 2.5 0 0 0-5 0v2.5a9 9 0 0 1-1.7 5.2" />),
  copy: I(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></>),
  download: I(<path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5M4 20h16" />),
  external: I(<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />),
  code: I(<path d="m8 7-5 5 5 5M16 7l5 5-5 5" />),
  logout: I(<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" />),
  shield: I(<><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>),
  shieldX: I(<><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9.5 9.5 5 5m0-5-5 5" /></>),
  x: I(<path d="M6 6l12 12M18 6 6 18" />),
  home: I(<><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" /></>),
  box: I(<><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>),
  flask: I(<><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" /><path d="M7 15h10" /></>),
  badge: I(<><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><circle cx="12" cy="11" r="2.5" /></>),
  chain: I(<><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1" /></>),
  list: I(<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />),
  cog: I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
  search: I(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  printer: I(<><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><rect x="7" y="14" width="10" height="7" rx="1" /></>),
  plus: I(<path d="M12 5v14M5 12h14" />),
  camera: I(<><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></>),
  image: I(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>),
  key: I(<><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M14 9l2 2" /></>),
  pen: I(<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />),
  clock: I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  arrowRight: I(<path d="M5 12h14m-5-5 5 5-5 5" />),
  arrowLeft: I(<path d="M19 12H5m5-5-5 5 5 5" />),
  lock: I(<><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>),
  menu: I(<path d="M4 7h16M4 12h16M4 17h16" />),
  eye: I(<><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="3" /></>),
  db: I(<><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" /></>),
  server: I(<><rect x="3.5" y="4" width="17" height="7" rx="2" /><rect x="3.5" y="13" width="17" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>),
};

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Aviso({ tono, titulo, children, className = '' }: { tono: 'ok' | 'alerta' | 'error' | 'info'; titulo: ReactNode; children?: ReactNode; className?: string }) {
  const estilos = {
    ok: 'border-lima-400/60 bg-lima-50 text-lima-800',
    alerta: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-celeste-200 bg-celeste-50 text-celeste-700',
  }[tono];
  const Ico = tono === 'ok' ? Icon.check : tono === 'info' ? Icon.shield : Icon.alert;
  return (
    <div className={`aparecer flex gap-3 rounded-xl border px-4 py-3 ${estilos} ${className}`} role={tono === 'error' ? 'alert' : 'status'}>
      <Ico className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{titulo}</p>
        {children ? <div className="mt-0.5 opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}

export function Dato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ink-mute">{etiqueta}</dt>
      <dd className={`mt-0.5 break-words text-sm font-semibold text-ink ${mono ? 'font-mono' : ''}`}>{valor ?? '—'}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- Estados

export const ESTADOS: Record<string, { nombre: string; clase: string; punto: string }> = {
  NUEVO: { nombre: 'Nuevo', clase: 'bg-slate-100 text-slate-700', punto: 'bg-slate-400' },
  PROCESADO: { nombre: 'Procesado', clase: 'bg-celeste-100 text-celeste-700', punto: 'bg-celeste-600' },
  EN_USO: { nombre: 'En uso', clase: 'bg-violet-100 text-violet-700', punto: 'bg-violet-500' },
  FINALIZADO: { nombre: 'Finalizado', clase: 'bg-lima-100 text-lima-800', punto: 'bg-lima-600' },
};

export function ChipEstado({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { nombre: estado, clase: 'bg-slate-100 text-slate-700', punto: 'bg-slate-400' };
  return (
    <span className={`chip ${e.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} />
      {e.nombre}
    </span>
  );
}

export const ROLES: Record<string, { nombre: string; clase: string }> = {
  ADMIN: { nombre: 'Administración', clase: 'bg-ink text-white' },
  OPERADOR_TOMA: { nombre: 'Operador de toma', clase: 'bg-celeste-100 text-celeste-700' },
  LABORATORIO: { nombre: 'Laboratorio', clase: 'bg-violet-100 text-violet-700' },
  VERIFICADOR: { nombre: 'Verificador', clase: 'bg-lima-100 text-lima-800' },
};

export function ChipRol({ rol }: { rol: string }) {
  const r = ROLES[rol] ?? { nombre: rol, clase: 'bg-slate-100' };
  return <span className={`chip ${r.clase}`}>{r.nombre}</span>;
}

// Hash o código largo, monoespaciado, con botón de copiar.
export function Hash({ valor, corto = false, className = '' }: { valor: string | null | undefined; corto?: boolean; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  if (!valor) return <span className="text-ink-mute">—</span>;
  return (
    <span className={`group inline-flex max-w-full items-center gap-1.5 ${className}`}>
      <span className="hash" title={valor}>
        {corto ? `${valor.slice(0, 10)}…${valor.slice(-6)}` : valor}
      </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(valor);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1200);
        }}
        className="shrink-0 rounded p-0.5 text-ink-mute opacity-60 transition hover:bg-celeste-50 hover:text-celeste-600 group-hover:opacity-100"
        title="Copiar"
      >
        {copiado ? <Icon.check className="h-3.5 w-3.5 text-lima-600" /> : <Icon.copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

export function Vacio({ icono: Ico = Icon.box, titulo, children }: { icono?: (p: IconProps) => ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-ink-mute">
        <Ico className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{titulo}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-ink-soft">{children}</div> : null}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
      <Spinner /> {texto}
    </div>
  );
}

export function Encabezado({ eyebrow, titulo, children, acciones }: { eyebrow?: string; titulo: ReactNode; children?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{titulo}</h1>
        {children ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-soft">{children}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </div>
  );
}

export function Modal({ abierto, onCerrar, titulo, children, ancho = 'max-w-lg' }: { abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode; ancho?: string }) {
  useEffect(() => {
    if (!abierto) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onCerrar}>
      <div className={`aparecer max-h-[92vh] w-full ${ancho} overflow-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="text-base font-bold">{titulo}</h2>
          <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 text-ink-mute hover:bg-surface hover:text-ink" aria-label="Cerrar">
            <Icon.x className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function fecha(iso: string | Date | null | undefined, conHora = true) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CL', conHora ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(iso));
}

export function hace(iso: string | Date) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function bytes(n: number) {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

export function mensaje(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
