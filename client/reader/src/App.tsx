import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { ApiError, api, clearToken, getToken, setToken } from './api';
import type { Expediente } from './types';

function Shell({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">Demostración</p>
            <h1 className="text-lg font-semibold">Registro de identificación genética</h1>
          </div>
          {action}
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-xs leading-5 text-slate-500">
        Prototipo de demostración con datos sintéticos. La referencia dactilar, cuando existe, es simulada y no
        corresponde a una huella real.
      </footer>
    </div>
  );
}

function formatFecha(value: string | null): string {
  if (!value) {
    return 'No registrada';
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function markerRows(markers: Record<string, unknown>) {
  return Object.entries(markers).map(([marker, alleles]) => ({
    marker,
    alleles: Array.isArray(alleles) ? alleles.map(String).join(' / ') : String(alleles),
  }));
}

function readAlertas(alertas: Expediente['alertasClinicas']) {
  if (!alertas || Array.isArray(alertas)) {
    return { alergias: [] as string[], observaciones: '' };
  }
  return {
    alergias: Array.isArray(alertas.alergias) ? alertas.alergias.filter((item) => typeof item === 'string') : [],
    observaciones: typeof alertas.observaciones === 'string' ? alertas.observaciones : '',
  };
}

function ExpedienteView({ expediente }: { expediente: Expediente }) {
  const alertas = readAlertas(expediente.alertasClinicas);
  const marcadores = markerRows(expediente.perfilGenetico.marcadoresSTR);
  const hayClinica = alertas.alergias.length > 0 || alertas.observaciones.length > 0;

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-50 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expediente</p>
        <h2 className="mt-2 font-serif text-3xl text-slate-900">{expediente.nombreCompleto}</h2>
        <p className="mt-2 font-mono text-sm text-slate-600">{expediente.identificador}</p>
      </div>

      <section className="border-t border-slate-200 px-6 py-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Identificación</h3>
        <dl className="mt-4 space-y-3">
          <div className="grid gap-1 sm:grid-cols-[220px_1fr]">
            <dt className="text-sm text-slate-500">Nombre completo</dt>
            <dd className="text-sm font-medium">{expediente.nombreCompleto}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[220px_1fr]">
            <dt className="text-sm text-slate-500">Identificador</dt>
            <dd className="font-mono text-sm font-medium">{expediente.identificador}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[220px_1fr]">
            <dt className="text-sm text-slate-500">Fecha de nacimiento</dt>
            <dd className="text-sm font-medium">{formatFecha(expediente.fechaNacimiento)}</dd>
          </div>
        </dl>
      </section>

      <section className="border-t border-slate-200 px-6 py-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Perfil genético STR</h3>
        <p className="mt-4 text-sm">
          <span className="text-slate-500">Código de muestra: </span>
          <span className="font-medium">{expediente.perfilGenetico.codigoMuestra || 'No registrado'}</span>
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border border-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Marcador</th>
                <th className="px-3 py-2 font-medium">Alelos</th>
              </tr>
            </thead>
            <tbody>
              {marcadores.map((row) => (
                <tr key={row.marker} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium">{row.marker}</td>
                  <td className="px-3 py-2 font-mono">{row.alleles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-slate-200 px-6 py-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Información clínica</h3>
        {hayClinica ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-slate-500">Alergias</p>
              {alertas.alergias.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {alertas.alergias.map((alergia) => (
                    <li
                      key={alergia}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-950"
                    >
                      {alergia}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm">Ninguna registrada</p>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-500">Observaciones</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                {alertas.observaciones || 'Sin observaciones'}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Sin información clínica registrada.</p>
        )}
      </section>

      <section className="border-t border-slate-200 px-6 py-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Huella dactilar</h3>
        {expediente.huellaDactilar ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
            <p className="text-sm font-medium">Referencia biométrica simulada</p>
            <p className="mt-2 font-mono text-sm">
              {expediente.huellaDactilar.referenciaSimulada || 'Sin código de referencia'}
            </p>
            <p className="mt-2 text-sm text-slate-600">Estado: {expediente.huellaDactilar.estado}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Sin registro asociado.</p>
        )}
      </section>
    </article>
  );
}

function ExpedientePage() {
  const { token: qrToken } = useParams();
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'invalid' | 'error'>('idle');
  const [pageError, setPageError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!qrToken || !authed) {
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus('loading');
      setPageError('');
      try {
        const data = await api<Expediente>('/qr/resolver', {
          method: 'POST',
          body: JSON.stringify({ token: qrToken }),
        });
        if (!cancelled) {
          setExpediente(data);
          setStatus('ready');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
          setAuthed(false);
          setStatus('idle');
          setLoginError('Sesión inválida o expirada.');
          return;
        }
        if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
          setStatus('invalid');
          setPageError(error.message);
          return;
        }
        setStatus('error');
        setPageError(error instanceof Error ? error.message : 'No se pudo conectar con el servidor.');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [qrToken, authed, attempt]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await api<{ accessToken: string; role: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (result.role !== 'READER') {
        setLoginError('Esta contraseña corresponde al administrador, no al lector.');
        return;
      }
      setToken(result.accessToken);
      setPassword('');
      setAuthed(true);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No se pudo conectar con el servidor.');
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    clearToken();
    setAuthed(false);
    setExpediente(null);
    setStatus('idle');
  }

  let body: ReactNode;

  if (!qrToken) {
    body = <Message title="Código QR requerido" text="La dirección no incluye un token de expediente." />;
  } else if (!authed) {
    body = (
      <form onSubmit={onLogin} className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold">Acceso de demostración</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ingresa la contraseña de lector para consultar este expediente.
        </p>
        <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-teal-700 focus:ring-2"
        />
        {loginError ? <p className="mt-3 text-sm text-red-700">{loginError}</p> : null}
        <button
          type="submit"
          disabled={loginLoading || !password}
          className="mt-6 rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loginLoading ? 'Ingresando...' : 'Ver expediente'}
        </button>
      </form>
    );
  } else if (status === 'loading' || status === 'idle') {
    body = <Message title="Consultando expediente" text="Buscando los datos almacenados." />;
  } else if (status === 'invalid') {
    body = (
      <Message
        title="Expediente no disponible"
        text={pageError || 'El código QR no es válido o el expediente no existe.'}
      />
    );
  } else if (status === 'error' || !expediente) {
    body = (
      <div className="rounded-lg border border-red-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold">No se pudo consultar el expediente</h2>
        <p className="mt-3 text-sm leading-6 text-red-700">{pageError || 'Error de conexión.'}</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="mt-6 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Reintentar
        </button>
      </div>
    );
  } else {
    body = <ExpedienteView expediente={expediente} />;
  }

  return (
    <Shell
      action={
        authed ? (
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        ) : null
      }
    >
      <main className="mx-auto w-full max-w-3xl px-4 py-8">{body}</main>
    </Shell>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function MissingToken() {
  return (
    <Shell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Message
          title="Código QR requerido"
          text="Abre esta aplicación desde la URL de un código QR generado en el administrador."
        />
      </main>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/q/:token" element={<ExpedientePage />} />
      <Route path="*" element={<MissingToken />} />
    </Routes>
  );
}
