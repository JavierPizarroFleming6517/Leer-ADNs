import { type ReactNode, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { Rol } from './api';
import Ficha from './ficha/Ficha';
import Admin from './paginas/Admin';
import Auditoria from './paginas/Auditoria';
import Verificacion from './paginas/Verificacion';
import Etiquetas from './paginas/Etiquetas';
import Inicio from './paginas/Inicio';
import Login from './paginas/Login';
import Personas from './paginas/Personas';
import QrResolver from './paginas/QrResolver';
import Stickers from './paginas/Stickers';
import { useSesion } from './sesion';
import { ChipRol, DESARROLLADOR, Icon, Marca } from './ui';

type Item = { a: string; texto: string; icono: (p: { className?: string }) => ReactNode; roles: Rol[] };

export const MENU: Item[] = [
  { a: '/', texto: 'Inicio', icono: Icon.home, roles: ['ADMIN'] },
  { a: '/verificacion', texto: 'Verificación', icono: Icon.badge, roles: ['ADMIN'] },
  { a: '/stickers', texto: 'Stickers y lotes', icono: Icon.qr, roles: ['ADMIN'] },
  { a: '/personas', texto: 'Personas', icono: Icon.users, roles: ['ADMIN'] },
  { a: '/auditoria', texto: 'Auditoría', icono: Icon.list, roles: ['ADMIN'] },
  { a: '/admin', texto: 'Administración', icono: Icon.cog, roles: ['ADMIN'] },
];

function Layout({ children }: { children: ReactNode }) {
  const { usuario, salir } = useSesion();
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
    <div className="min-h-screen lg:bg-[linear-gradient(to_right,#0B2F45_16rem,#F4F8FB_16rem)] lg:pl-64">
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
          {usuario ? (
            <div className="flex items-center gap-3 border-l border-line pl-3">
              <div className="sm:hidden">
                <ChipRol rol={usuario.rol} />
              </div>
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
      <Route path="/verificacion" element={<Protegida><Verificacion /></Protegida>} />
      <Route path="/escanear" element={<Navigate to="/verificacion" replace />} />
      <Route path="/s/:token" element={<Protegida><QrResolver /></Protegida>} />
      <Route path="/stickers" element={<Protegida roles={rolesDe('/stickers')}><Stickers /></Protegida>} />
      <Route path="/stickers/:codigo" element={<Protegida><Ficha /></Protegida>} />
      <Route path="/stickers/:codigo/:pestana" element={<Protegida><Ficha /></Protegida>} />
      <Route path="/lotes/:id/etiquetas" element={usuario ? <Etiquetas /> : <Navigate to="/login" replace />} />
      <Route path="/personas" element={<Protegida roles={rolesDe('/personas')}><Personas /></Protegida>} />
      <Route path="/laboratorio" element={<Navigate to="/" replace />} />
      <Route path="/custodia" element={<Navigate to="/" replace />} />
      <Route path="/auditoria" element={<Protegida roles={rolesDe('/auditoria')}><Auditoria /></Protegida>} />
      <Route path="/admin" element={<Protegida roles={rolesDe('/admin')}><Admin /></Protegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
