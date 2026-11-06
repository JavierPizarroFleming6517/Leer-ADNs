import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { Rol } from './api';
import { api } from './api';
import Ficha from './ficha/Ficha';
import Admin from './paginas/Admin';
import Auditoria from './paginas/Auditoria';
import Custodia from './paginas/Custodia';
import Escanear from './paginas/Escanear';
import Etiquetas from './paginas/Etiquetas';
import Inicio from './paginas/Inicio';
import Laboratorio from './paginas/Laboratorio';
import Login from './paginas/Login';
import Personas from './paginas/Personas';
import QrResolver from './paginas/QrResolver';
import Stickers from './paginas/Stickers';
import Verificacion from './paginas/Verificacion';
import { useSesion } from './sesion';
import { ChipRol, DESARROLLADOR, Icon, Marca } from './ui';

type Item = { a: string; texto: string; icono: (p: { className?: string }) => ReactNode; roles: Rol[] };

export const MENU: Item[] = [
  { a: '/', texto: 'Inicio', icono: Icon.home, roles: ['ADMIN', 'OPERADOR_TOMA', 'LABORATORIO', 'VERIFICADOR'] },
  { a: '/escanear', texto: 'Escanear', icono: Icon.scan, roles: ['ADMIN', 'OPERADOR_TOMA', 'LABORATORIO', 'VERIFICADOR'] },
  { a: '/stickers', texto: 'Stickers y lotes', icono: Icon.qr, roles: ['ADMIN', 'OPERADOR_TOMA', 'LABORATORIO'] },
  { a: '/personas', texto: 'Personas', icono: Icon.users, roles: ['ADMIN', 'OPERADOR_TOMA', 'VERIFICADOR'] },
  { a: '/laboratorio', texto: 'Laboratorio', icono: Icon.flask, roles: ['ADMIN', 'LABORATORIO'] },
  { a: '/verificacion', texto: 'Verificación', icono: Icon.badge, roles: ['ADMIN', 'VERIFICADOR', 'OPERADOR_TOMA', 'LABORATORIO'] },
  { a: '/custodia', texto: 'Custodia', icono: Icon.chain, roles: ['ADMIN', 'LABORATORIO', 'VERIFICADOR'] },
  { a: '/auditoria', texto: 'Auditoría', icono: Icon.list, roles: ['ADMIN'] },
  { a: '/admin', texto: 'Administración', icono: Icon.cog, roles: ['ADMIN'] },
];

type Salud = { api: boolean; db: boolean; afis: boolean; afisVersion: string | null; umbral: number };

export function useSalud() {
  const [s, setS] = useState<Salud | null>(null);
  useEffect(() => {
    let vivo = true;
    const f = () =>
      api<Salud>('/salud')
        .then((r) => vivo && setS(r))
        .catch(() => vivo && setS({ api: false, db: false, afis: false, afisVersion: null, umbral: 40 }));
    f();
    const t = setInterval(f, 8000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);
  return s;
}

function Servicios({ salud }: { salud: Salud | null }) {
  const items = [
    { n: 'API', ok: salud?.api, t: 'Servidor de la API' },
    { n: 'Base de datos', ok: salud?.db, t: 'PostgreSQL' },
    { n: 'Motor biométrico', ok: salud?.afis, t: salud?.afis ? `SourceAFIS ${salud.afisVersion} · umbral ${salud.umbral}` : 'Motor biométrico no disponible' },
  ];
  return (
    <div className="hidden items-center gap-1 rounded-xl border border-line bg-white px-1.5 py-1 md:flex" data-testid="servicios">
      {items.map((i) => (
        <span key={i.n} title={i.t} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-soft">
          <span className={`h-2 w-2 rounded-full ${salud === null ? 'bg-slate-300' : i.ok ? 'bg-lima-400' : 'animate-pulse bg-red-500'}`} />
          {i.n}
          {salud && !i.ok ? <span className="text-red-600">· no disponible</span> : null}
        </span>
      ))}
    </div>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const { usuario, salir } = useSesion();
  const salud = useSalud();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);
  const items = MENU.filter((m) => usuario && m.roles.includes(usuario.rol));

  const navegacion = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {items.map((m) => (
        <NavLink
          key={m.a}
          to={m.a}
          end={m.a === '/'}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive ? 'bg-white/10 text-white' : 'text-celeste-100/70 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <m.icono className={`h-[18px] w-[18px] ${isActive ? 'text-lima-400' : 'text-celeste-200/60 group-hover:text-celeste-200'}`} />
              {m.texto}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const lateral = (
    <div className="flex h-full flex-col bg-ink">
      <div className="px-6 pb-6 pt-6">
        <Marca oscuro />
      </div>
      {navegacion}
      <div className="m-3 rounded-xl bg-white/5 px-4 py-3">
        <p className="text-[11px] leading-4 text-celeste-100/60">
          Desarrollado por <span className="font-bold text-celeste-100">{DESARROLLADOR}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-celeste-100/40">Versión de demostración · datos ficticios</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-imprimir fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{lateral}</aside>
      {menu ? (
        <div className="no-imprimir fixed inset-0 z-40 lg:hidden" onClick={() => setMenu(false)}>
          <div className="absolute inset-0 bg-ink/50" />
          <div className="aparecer absolute inset-y-0 left-0 w-72" onClick={(e) => e.stopPropagation()}>
            {lateral}
          </div>
        </div>
      ) : null}
      <header className="no-imprimir sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-surface lg:hidden" onClick={() => setMenu(true)} aria-label="Menú">
            <Icon.menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Marca compacta />
          </div>
          <div className="flex-1" />
          <Servicios salud={salud} />
          {usuario ? (
            <div className="flex items-center gap-3 border-l border-line pl-3">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold" data-testid="usuario-actual">{usuario.nombre}</p>
                <div className="mt-0.5">
                  <ChipRol rol={usuario.rol} />
                </div>
              </div>
              <button type="button" onClick={salir} className="rounded-xl p-2 text-ink-mute transition hover:bg-surface hover:text-ink" title="Cerrar sesión" aria-label="Cerrar sesión">
                <Icon.logout className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
        {salud && !salud.afis ? (
          <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 sm:px-6 lg:px-8" data-testid="afis-caido">
            <Icon.alert className="h-4 w-4" /> Motor biométrico no disponible: la extracción y búsqueda de huellas están detenidas hasta que el servicio afis responda.
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

function Protegida({ roles, children }: { roles?: Rol[]; children: ReactNode }) {
  const { usuario } = useSesion();
  const loc = useLocation();
  if (!usuario) return <Navigate to={`/login?siguiente=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (roles && !roles.includes(usuario.rol)) {
    return (
      <Layout>
        <div className="card mx-auto max-w-md p-8 text-center">
          <Icon.lock className="mx-auto h-8 w-8 text-ink-mute" />
          <p className="mt-3 font-semibold">Tu rol no tiene acceso a esta sección.</p>
        </div>
      </Layout>
    );
  }
  return <Layout>{children}</Layout>;
}

const rolesDe = (a: string) => MENU.find((m) => m.a === a)!.roles;

export default function App() {
  const nav = useNavigate();
  const { usuario } = useSesion();
  useEffect(() => {
    const f = () => nav(`/login?expirada=1&siguiente=${encodeURIComponent(location.pathname)}`);
    window.addEventListener('trazagen:sesion-expirada', f);
    return () => window.removeEventListener('trazagen:sesion-expirada', f);
  }, [nav]);

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protegida><Inicio /></Protegida>} />
      <Route path="/escanear" element={<Protegida><Escanear /></Protegida>} />
      <Route path="/s/:token" element={<Protegida><QrResolver /></Protegida>} />
      <Route path="/stickers" element={<Protegida roles={rolesDe('/stickers')}><Stickers /></Protegida>} />
      <Route path="/stickers/:codigo" element={<Protegida><Ficha /></Protegida>} />
      <Route path="/stickers/:codigo/:pestana" element={<Protegida><Ficha /></Protegida>} />
      <Route path="/lotes/:id/etiquetas" element={usuario ? <Etiquetas /> : <Navigate to="/login" replace />} />
      <Route path="/personas" element={<Protegida roles={rolesDe('/personas')}><Personas /></Protegida>} />
      <Route path="/laboratorio" element={<Protegida roles={rolesDe('/laboratorio')}><Laboratorio /></Protegida>} />
      <Route path="/verificacion" element={<Protegida roles={rolesDe('/verificacion')}><Verificacion /></Protegida>} />
      <Route path="/custodia" element={<Protegida roles={rolesDe('/custodia')}><Custodia /></Protegida>} />
      <Route path="/auditoria" element={<Protegida roles={rolesDe('/auditoria')}><Auditoria /></Protegida>} />
      <Route path="/admin" element={<Protegida roles={rolesDe('/admin')}><Admin /></Protegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
