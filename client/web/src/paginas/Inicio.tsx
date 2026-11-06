import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useCarga, useSesion } from '../sesion';
import { Cargando, Encabezado, Icon, Vacio, fecha, hace } from '../ui';

type DatosInicio = {
  stickersPorEstado: Record<string, number>;
  totalStickers: number;
  laboratorio: {
    porEtapa: { etapa: string; nombre: string; total: number; diasMax: number; diasProm: number }[];
    muestras: { codigo: string; sticker: string; etapaNombre: string; diasEnEtapa: number; diasEnLab: number }[];
  };
  alertas: {
    duplicados: { sticker: string; dedo: string; coincideCon: string; dedoCoincidente: string; puntaje: number; fecha: string }[];
    vinculosInvalidos: { sticker: string; fallas: string[] }[];
    qrFalsos: { total: number; ultimos: { fecha: string; usuarioNombre: string | null; detalle: { motivo?: string } | null; ip: string | null }[] };
    sellos: { sticker: string; muestra: string; estadoSello: string }[];
  };
  eventos: { id: string; sticker: string; nombre: string; fecha: string; responsable: string; hash: string }[];
  totales: { personas: number; huellas: number; vinculos: number; busquedasMes: number };
};

function Kpi({ titulo, valor, detalle, icono: I }: { titulo: string; valor: ReactNode; detalle: string; icono: (p: { className?: string }) => ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{titulo}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-celeste-50 text-celeste-600">
          <I className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-ink">{valor}</p>
      <p className="mt-1 text-xs text-ink-mute">{detalle}</p>
    </div>
  );
}

function Alerta({ tono, icono: I, titulo, children, a }: { tono: 'rojo' | 'ambar'; icono: (p: { className?: string }) => ReactNode; titulo: ReactNode; children: ReactNode; a?: string }) {
  const c = tono === 'rojo' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900';
  const contenido = (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 transition ${c} ${a ? 'hover:shadow-md' : ''}`}>
      <I className={`mt-0.5 h-5 w-5 shrink-0 ${tono === 'rojo' ? 'text-red-600' : 'text-amber-600'}`} />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{titulo}</p>
        <div className="mt-0.5 text-xs opacity-90">{children}</div>
      </div>
      {a ? <Icon.arrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 opacity-50" /> : null}
    </div>
  );
  return a ? <Link to={a}>{contenido}</Link> : contenido;
}

export default function Inicio() {
  const { usuario } = useSesion();
  const { datos: d, error } = useCarga(() => api<DatosInicio>('/inicio'));
  if (error) return <Vacio icono={Icon.alert} titulo="No se pudo cargar el inicio">{error}</Vacio>;
  if (!d) return <Cargando />;
  const al = d.alertas;
  const nAlertas = al.duplicados.length + al.vinculosInvalidos.length + (al.qrFalsos.total ? 1 : 0);
  return (
    <div>
      <Encabezado eyebrow={new Intl.DateTimeFormat('es-CL', { dateStyle: 'full' }).format(new Date())} titulo={`Hola, ${usuario?.nombre.split(' ').slice(0, usuario.nombre.startsWith('Dra.') ? 2 : 1).join(' ')}`}>
        Estado de la plataforma: stickers, alertas e integridad, calculado en vivo desde la base.
      </Encabezado>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Personas registradas" valor={d.totales.personas} detalle="Datos sensibles cifrados (AES-256-GCM)" icono={Icon.users} />
        <Kpi titulo="Vínculos firmados" valor={d.totales.vinculos} detalle={al.vinculosInvalidos.length ? `${al.vinculosInvalidos.length} con integridad alterada` : 'Todos íntegros (Ed25519)'} icono={Icon.shield} />
        <Kpi titulo="Huellas en el registro" valor={d.totales.huellas} detalle="Plantillas SourceAFIS para búsqueda 1:N" icono={Icon.fingerprint} />
        <Kpi titulo="Verificaciones del mes" valor={d.totales.busquedasMes} detalle="Verificaciones por huella y por perfil" icono={Icon.search} />
      </div>

      <div className="mt-6">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon.alert className="h-5 w-5 text-celeste-600" /> Alertas
            </h2>
            <span className={`chip ${nAlertas ? 'bg-red-100 text-red-700' : 'bg-lima-100 text-lima-800'}`}>{nAlertas ? `${nAlertas} activas` : 'Sin alertas'}</span>
          </div>
          <div className="flex flex-col gap-4" data-testid="alertas">
            {al.vinculosInvalidos.map((v) => (
              <Alerta key={v.sticker} tono="rojo" icono={Icon.shieldX} titulo={<>Vínculo con integridad alterada · <span className="font-mono">{v.sticker}</span></>} a={`/stickers/${v.sticker}/vinculo`}>
                No coincide con lo firmado: {v.fallas.join(', ')}.
              </Alerta>
            ))}
            {al.duplicados.map((x, i) => (
              <Alerta key={i} tono="rojo" icono={Icon.fingerprint} titulo={<>Posible huella duplicada · <span className="font-mono">{x.sticker}</span></>} a={`/stickers/${x.sticker}/huellas`}>
                {x.dedo} coincide con {x.dedoCoincidente.toLowerCase()} del sticker <span className="font-mono">{x.coincideCon}</span> · puntaje SourceAFIS {x.puntaje.toFixed(1)} · {hace(x.fecha)}
              </Alerta>
            ))}
            {al.qrFalsos.total ? (
              <Alerta tono="ambar" icono={Icon.qr} titulo={`${al.qrFalsos.total} intento${al.qrFalsos.total > 1 ? 's' : ''} de QR falso`} a="/auditoria?accion=QR_FALSO">
                Último: {al.qrFalsos.ultimos[0]?.detalle?.motivo ?? 'firma no válida'} · {al.qrFalsos.ultimos[0] ? hace(al.qrFalsos.ultimos[0].fecha) : ''}
              </Alerta>
            ) : null}
            {!nAlertas ? <p className="rounded-xl bg-lima-50 px-4 py-3 text-sm text-lima-800">Todo en orden: sin duplicados, vínculos íntegros y sin intentos de QR falso.</p> : null}
          </div>
        </section>
      </div>

      <div className="mt-6">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon.chain className="h-5 w-5 text-celeste-600" /> Últimos eventos de custodia
            </h2>
          </div>
          <ul className="space-y-1">
            {d.eventos.map((e) => (
              <li key={e.id}>
                <Link to={`/stickers/${e.sticker}/custodia`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-celeste-50 text-celeste-700">
                    <Icon.chain className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {e.nombre} <span className="font-mono text-xs font-medium text-ink-mute">{e.sticker}</span>
                    </span>
                    <span className="block truncate text-xs text-ink-mute">
                      {e.responsable} · {fecha(e.fecha)}
                    </span>
                  </span>
                  <span className="hidden font-mono text-[11px] text-ink-mute sm:block">{e.hash.slice(0, 10)}…</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
