import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { ApiError, api, clearToken, getToken, setToken } from './api';
import { CODIS_20, type Expediente } from './types';
import { Aviso, DESARROLLADOR, Dato, HeliceFondo, Icon, Marca, PRODUCTO, Spinner } from './ui';

function fechaLarga(value: string | null): string {
  if (!value) return 'No registrada';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date(value);
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function fechaHora(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function edad(fecha: string | null): string | null {
  if (!fecha) return null;
  const n = new Date(fecha);
  const hoy = new Date();
  let a = hoy.getUTCFullYear() - n.getUTCFullYear();
  if (hoy.getUTCMonth() < n.getUTCMonth() || (hoy.getUTCMonth() === n.getUTCMonth() && hoy.getUTCDate() < n.getUTCDate())) a -= 1;
  return `${a} años`;
}

function Shell({ accion, children }: { accion?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden bg-ink">
        <HeliceFondo className="absolute -right-16 -top-40 h-[420px] w-[260px] rotate-90 opacity-40" />
        <div className="relative mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-4">
          <Marca subtitulo="Consulta de expediente" oscuro />
          {accion}
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mx-auto w-full max-w-2xl px-5 pb-10 pt-4 text-center text-xs leading-5 text-ink-mute">
        {PRODUCTO} · Prototipo de demostración con datos de prueba.
        <br />
        La huella dactilar es simulada. Desarrollado por {DESARROLLADOR}.
      </footer>
    </div>
  );
}

function Seccion({ titulo, icono, children, extra }: { titulo: string; icono: ReactNode; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-celeste-50 text-celeste-600">{icono}</span>
          {titulo}
        </h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

function ExpedienteVista({ e }: { e: Expediente }) {
  const [verMarcadores, setVerMarcadores] = useState(false);
  const pg = e.perfilGenetico;
  const iniciales = e.nombreCompleto
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-4">
      <article className="card overflow-hidden">
        <div className="bg-gradient-to-br from-celeste-50 via-white to-lima-50 px-5 pb-5 pt-6">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-ink text-xl font-bold text-white">
              {iniciales}
            </span>
            <div className="min-w-0">
              <span className="chip bg-lima-100 text-lima-800">
                <Icon.check className="h-3.5 w-3.5" /> Registro activo
              </span>
              <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight">{e.nombreCompleto}</h2>
              <p className="mt-1 font-mono text-sm text-ink-soft">{e.identificador}</p>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line px-5 py-5">
          <Dato etiqueta="Fecha de nacimiento" valor={fechaLarga(e.fechaNacimiento)} />
          <Dato etiqueta="Edad" valor={edad(e.fechaNacimiento) ?? '—'} />
          <Dato etiqueta="Nacionalidad" valor={e.nacionalidad || '—'} />
          <Dato etiqueta="Fecha de registro" valor={fechaHora(e.registradoEn)} />
        </dl>
      </article>

      <Seccion
        titulo="Perfil genético"
        icono={<Icon.dna className="h-4 w-4" />}
        extra={<span className="font-mono text-xs text-ink-mute">{pg.codigoMuestra}</span>}
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-surface px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">CODIS</p>
            <p className="font-mono text-lg font-semibold">{pg.resumen.codisPresentes}/20</p>
          </div>
          <div className="rounded-xl bg-surface px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">Loci</p>
            <p className="font-mono text-lg font-semibold">{pg.resumen.totalLoci}</p>
          </div>
          <div className="rounded-xl bg-surface px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">Amelog.</p>
            <p className="font-mono text-lg font-semibold">{pg.resumen.sexo === 'sin dato' ? '—' : pg.resumen.sexo}</p>
          </div>
        </div>

        <button type="button" onClick={() => setVerMarcadores((v) => !v)} className="btn-secondary mt-4 w-full">
          <Icon.dna className="h-4 w-4" /> {verMarcadores ? 'Ocultar marcadores' : 'Ver marcadores STR'}
        </button>

        {verMarcadores ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(pg.marcadoresSTR).map(([locus, alelos]) => (
              <div key={locus} className={`rounded-xl border px-3 py-2 ${locus === 'AMEL' ? 'border-celeste-200 bg-celeste-50' : 'border-line'}`}>
                <p className="flex items-center justify-between text-[11px] font-semibold text-ink-soft">
                  {locus === 'AMEL' ? 'Amelogenina' : locus}
                  {CODIS_20.includes(locus) ? <span className="h-1.5 w-1.5 rounded-full bg-lima-400" /> : null}
                </p>
                <p className="font-mono text-sm font-semibold">
                  {alelos.length === 1 && locus !== 'AMEL' ? `${alelos[0]}, ${alelos[0]}` : alelos.join(', ')}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Seccion>

      <Seccion titulo="Huella dactilar" icono={<Icon.fingerprint className="h-4 w-4" />}>
        {e.huellaDactilar ? (
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-line bg-surface px-4 py-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-celeste-600 ring-1 ring-line">
              <Icon.fingerprint className="h-9 w-9" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold">{e.huellaDactilar.referenciaSimulada ?? 'Sin código'}</p>
              <p className="mt-0.5 text-xs text-ink-mute">Referencia biométrica {e.huellaDactilar.estado}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Sin referencia asociada.</p>
        )}
      </Seccion>

      <Seccion titulo="Origen del dato" icono={<Icon.file className="h-4 w-4" />}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Dato etiqueta="Formato" valor={pg.formatoOrigen ?? '—'} />
          <Dato etiqueta="Archivo" valor={<span className="break-all">{pg.archivoOrigen ?? '—'}</span>} />
          <Dato etiqueta="QR emitido" valor={fechaHora(e.qrGeneradoEn)} />
          <Dato etiqueta="Muestra" valor={pg.codigoMuestra ?? '—'} mono />
          <div className="col-span-2">
            <Dato
              etiqueta="Huella SHA-256 del archivo"
              valor={<span className="break-all text-xs font-medium text-ink-soft">{pg.hashArchivo ?? '—'}</span>}
              mono
            />
          </div>
        </dl>
      </Seccion>
    </div>
  );
}

function Tarjeta({ titulo, texto, icono, children }: { titulo: string; texto: string; icono?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card p-6 text-center">
      {icono ? <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-celeste-50 text-celeste-600">{icono}</div> : null}
      <h2 className="text-lg font-bold">{titulo}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{texto}</p>
      {children}
    </div>
  );
}

function ExpedientePage() {
  const { token: qrToken } = useParams();
  const [autenticado, setAutenticado] = useState(() => Boolean(getToken()));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginCargando, setLoginCargando] = useState(false);
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'listo' | 'invalido' | 'error'>('idle');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!qrToken || !autenticado) return;
    let cancelado = false;
    (async () => {
      setEstado('cargando');
      setError('');
      try {
        const data = await api<Expediente>('/qr/resolver', { method: 'POST', body: JSON.stringify({ token: qrToken }) });
        if (!cancelado) {
          setExpediente(data);
          setEstado('listo');
        }
      } catch (err) {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          setAutenticado(false);
          setEstado('idle');
          setLoginError('Sesión inválida o expirada.');
          return;
        }
        if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
          setEstado('invalido');
          setError(err.message);
          return;
        }
        setEstado('error');
        setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [qrToken, autenticado, intento]);

  async function entrar(ev: FormEvent) {
    ev.preventDefault();
    setLoginCargando(true);
    setLoginError('');
    try {
      const r = await api<{ accessToken: string; role: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (r.role !== 'READER') {
        setLoginError('Esta contraseña corresponde al administrador, no al lector.');
        return;
      }
      setToken(r.accessToken);
      setPassword('');
      setAutenticado(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setLoginCargando(false);
    }
  }

  function salir() {
    clearToken();
    setAutenticado(false);
    setExpediente(null);
    setEstado('idle');
  }

  let cuerpo: ReactNode;
  if (!qrToken) {
    cuerpo = <Tarjeta titulo="Código QR requerido" texto="La dirección no incluye un token de expediente." icono={<Icon.qr className="h-7 w-7" />} />;
  } else if (!autenticado) {
    cuerpo = (
      <form onSubmit={entrar} className="card p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-celeste-50 text-celeste-600">
          <Icon.shield className="h-6 w-6" />
        </div>
        <p className="eyebrow">Acceso restringido</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight">Verificar identidad</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Este código QR abre un expediente de identificación. Solo personal autorizado puede consultarlo.
        </p>
        <label className="label mt-6" htmlFor="password">
          Contraseña de lector
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          className="input"
          placeholder="••••••••"
        />
        {loginError ? <p className="mt-3 text-sm text-red-700">{loginError}</p> : null}
        <button type="submit" disabled={loginCargando || !password} className="btn-primary mt-5 w-full py-3">
          {loginCargando ? <Spinner /> : null}
          {loginCargando ? 'Verificando…' : 'Ver expediente'}
        </button>
      </form>
    );
  } else if (estado === 'cargando' || estado === 'idle') {
    cuerpo = (
      <Tarjeta titulo="Consultando expediente" texto="Verificando el código QR en el registro." icono={<Spinner className="h-7 w-7" />} />
    );
  } else if (estado === 'invalido') {
    cuerpo = (
      <Tarjeta
        titulo="Expediente no disponible"
        texto={error || 'El código QR no es válido o fue reemplazado por uno nuevo.'}
        icono={<Icon.alert className="h-7 w-7" />}
      />
    );
  } else if (estado === 'error' || !expediente) {
    cuerpo = (
      <div className="space-y-4">
        <Aviso tono="error" titulo="No se pudo consultar el expediente">
          {error || 'Error de conexión.'}
        </Aviso>
        <button type="button" onClick={() => setIntento((v) => v + 1)} className="btn-secondary w-full">
          Reintentar
        </button>
      </div>
    );
  } else {
    cuerpo = <ExpedienteVista e={expediente} />;
  }

  return (
    <Shell
      accion={
        autenticado ? (
          <button type="button" onClick={salir} className="btn px-3 py-2 text-celeste-100 hover:bg-white/10">
            <Icon.logout className="h-4 w-4" /> <span className="hidden sm:inline">Salir</span>
          </button>
        ) : null
      }
    >
      <main className="mx-auto w-full max-w-2xl px-5 py-6">{cuerpo}</main>
    </Shell>
  );
}

function SinToken() {
  return (
    <Shell>
      <main className="mx-auto w-full max-w-2xl px-5 py-6">
        <Tarjeta
          titulo="Escanea un código QR"
          texto="Abre esta aplicación desde el código QR generado en el administrador."
          icono={<Icon.qr className="h-7 w-7" />}
        />
      </main>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/q/:token" element={<ExpedientePage />} />
      <Route path="*" element={<SinToken />} />
    </Routes>
  );
}
