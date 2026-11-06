import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useSesion } from '../sesion';
import { Aviso, ChipRol, DESARROLLADOR, HeliceFondo, Icon, LEMA, Logo, Marca, Spinner, mensaje } from '../ui';

type Demo = { nombre: string; email: string; rol: string; institucion: string | null };

export default function Login() {
  const { entrar } = useSesion();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [demo, setDemo] = useState<Demo[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api<Demo[]>('/auth/usuarios-demo').then(setDemo).catch(() => setDemo([]));
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await entrar(email, password);
      const sig = params.get('siguiente');
      nav(sig && sig.startsWith('/') && !sig.startsWith('//') ? sig : '/', { replace: true });
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <HeliceFondo className="absolute -right-24 top-0 h-full w-[520px] opacity-50" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Marca oscuro />
          <div className="max-w-lg">
            <p className="eyebrow text-lima-400">Huella dactilar · ADN · Cadena de custodia</p>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-white">
              Una toma. Una identidad dactilogenética verificable.
            </h1>
            <p className="mt-5 text-base leading-7 text-celeste-100/80">
              Cada sticker une huellas y perfil genético de una persona bajo un vínculo firmado digitalmente, con una
              cadena de custodia que no se puede alterar.
            </p>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[
                ['SourceAFIS', 'Búsqueda 1:N real'],
                ['Ed25519', 'Firmas digitales'],
                ['SHA-256', 'Cadena de hashes'],
              ].map(([a, b]) => (
                <div key={a} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="font-mono text-sm font-semibold text-white">{a}</p>
                  <p className="mt-0.5 text-[11px] text-celeste-100/60">{b}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-celeste-100/50">
            Desarrollado por <span className="font-semibold text-celeste-100/80">{DESARROLLADOR}</span> · Versión de demostración
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <form onSubmit={enviar} className="w-full max-w-md">
          <div className="lg:hidden">
            <div className="flex items-center gap-3">
              <Logo className="h-11 w-11" />
              <div>
                <p className="text-lg font-bold">TrazaGen</p>
                <p className="text-xs text-ink-mute">{LEMA}</p>
              </div>
            </div>
          </div>
          <p className="eyebrow mt-10 lg:mt-0">Acceso</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-ink-soft">Cada rol ve solo lo que necesita. Los permisos se revisan en el servidor.</p>
          {params.get('expirada') ? (
            <Aviso tono="info" titulo="Tu sesión expiró" className="mt-5">
              Ingresa de nuevo para continuar.
            </Aviso>
          ) : null}

          {demo.length ? (
            <div className="mt-7">
              <p className="label">Entrar como · Usuarios de demostración</p>
              <div className="grid gap-2 sm:grid-cols-2" data-testid="usuarios-demo">
                {demo.map((u) => (
                  <button
                    type="button"
                    key={u.email}
                    onClick={() => {
                      setEmail(u.email);
                      setError('');
                      document.getElementById('password')?.focus();
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-left transition ${
                      email === u.email ? 'border-celeste-400 bg-celeste-50 ring-4 ring-celeste-100' : 'border-line bg-white hover:border-celeste-200 hover:bg-celeste-50/50'
                    }`}
                  >
                    <p className="truncate text-sm font-semibold">{u.nombre}</p>
                    <div className="mt-1">
                      <ChipRol rol={u.rol} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label htmlFor="email" className="label mt-6">
            Correo
          </label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="nombre@institucion.cl" />
          <label htmlFor="password" className="label mt-4">
            Contraseña
          </label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
          {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
          <button type="submit" disabled={cargando || !email || !password} className="btn-primary mt-6 w-full py-3">
            {cargando ? <Spinner /> : <Icon.lock className="h-4 w-4" />}
            {cargando ? 'Verificando…' : 'Ingresar'}
          </button>
          <p className="mt-6 flex items-center gap-2 text-xs text-ink-mute">
            <Icon.shield className="h-4 w-4" /> Datos de demostración ficticios. Las huellas provienen de la base pública FVC2002.
          </p>
        </form>
      </main>
    </div>
  );
}
