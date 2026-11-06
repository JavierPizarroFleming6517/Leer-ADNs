import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Rol, type Usuario, api, guardarSesion, sesionGuardada } from './api';

type Ctx = {
  usuario: Usuario | null;
  entrar: (email: string, password: string) => Promise<Usuario>;
  salir: () => void;
  puede: (...roles: Rol[]) => boolean;
};

const SesionCtx = createContext<Ctx | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => sesionGuardada()?.usuario ?? null);

  useEffect(() => {
    const f = () => setUsuario(null);
    window.addEventListener('trazagen:sesion-expirada', f);
    return () => window.removeEventListener('trazagen:sesion-expirada', f);
  }, []);

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await api<{ accessToken: string; usuario: Usuario }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    guardarSesion({ token: r.accessToken, usuario: r.usuario });
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const salir = useCallback(() => {
    guardarSesion(null);
    setUsuario(null);
  }, []);

  const puede = useCallback((...roles: Rol[]) => Boolean(usuario && roles.includes(usuario.rol)), [usuario]);

  return <SesionCtx.Provider value={{ usuario, entrar, salir, puede }}>{children}</SesionCtx.Provider>;
}

export function useSesion() {
  const c = useContext(SesionCtx);
  if (!c) throw new Error('useSesion fuera del proveedor');
  return c;
}

// Carga simple con recarga manual.
export function useCarga<T>(f: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    f()
      .then((d) => vivo && (setDatos(d), setError('')))
      .catch((e: unknown) => vivo && setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { datos, error, cargando, recargar: () => setN((x) => x + 1), setDatos };
}
