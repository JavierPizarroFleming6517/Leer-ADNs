const CLAVE = 'trazagen.sesion';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly cuerpo?: unknown,
  ) {
    super(message);
  }
}

export type Usuario = { id: string; nombre: string; email: string; rol: Rol; institucion: string | null };
export type Rol = 'ADMIN' | 'OPERADOR_TOMA' | 'LABORATORIO' | 'VERIFICADOR';

export function sesionGuardada(): { token: string; usuario: Usuario } | null {
  try {
    const t = sessionStorage.getItem(CLAVE);
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(s: { token: string; usuario: Usuario } | null) {
  try {
    if (s) sessionStorage.setItem(CLAVE, JSON.stringify(s));
    else sessionStorage.removeItem(CLAVE);
  } catch {
    /* almacenamiento no disponible */
  }
}

function texto(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.map(String).join(' ');
    if (typeof m === 'string') return m;
  }
  return 'Ocurrió un error inesperado.';
}

async function solicitud(ruta: string, opciones: RequestInit = {}): Promise<Response> {
  const headers = new Headers(opciones.headers);
  if (opciones.body !== undefined && !(opciones.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const s = sesionGuardada();
  if (s) headers.set('Authorization', `Bearer ${s.token}`);
  let r: Response;
  try {
    r = await fetch(`/api${ruta}`, { ...opciones, headers, cache: 'no-store' });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor.', 0);
  }
  if (r.status === 401 && s && ruta !== '/auth/login') {
    guardarSesion(null);
    window.dispatchEvent(new Event('trazagen:sesion-expirada'));
  }
  return r;
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const r = await solicitud(ruta, opciones);
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(texto(body), r.status, body);
  return body as T;
}

export const post = <T,>(ruta: string, cuerpo?: unknown) =>
  api<T>(ruta, { method: 'POST', body: cuerpo instanceof FormData ? cuerpo : JSON.stringify(cuerpo ?? {}) });

// Descarga binaria autenticada (imágenes de huellas, PDF, archivos de laboratorio).
export async function blob(ruta: string): Promise<Blob> {
  const r = await solicitud(ruta);
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new ApiError(texto(body), r.status);
  }
  return r.blob();
}

export async function descargar(ruta: string, nombre: string) {
  const b = await blob(ruta);
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function abrir(ruta: string) {
  const b = await blob(ruta);
  window.open(URL.createObjectURL(b), '_blank', 'noopener');
}
