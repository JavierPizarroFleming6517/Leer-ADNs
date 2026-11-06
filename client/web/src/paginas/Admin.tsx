import { type FormEvent, useState } from 'react';
import { api, post } from '../api';
import { useCarga, useSesion } from '../sesion';
import type { Catalogos } from '../tipos';
import { CODIS_20, DEDOS } from '../tipos';
import { Aviso, ChipRol, Encabezado, Icon, Modal, ROLES, Spinner, fecha, mensaje } from '../ui';

type Usuario = { id: string; nombre: string; email: string; rol: string; institucion: string | null; activo: boolean; createdAt: string };

export default function Admin() {
  const [pestana, setPestana] = useState<'usuarios' | 'plantillas' | 'kits'>('usuarios');
  return (
    <div>
      <Encabezado eyebrow="Configuración" titulo="Administración">
        Usuarios y roles, plantillas de sticker por país y kits de amplificación con sus loci.
      </Encabezado>
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        {(
          [
            ['usuarios', 'Usuarios'],
            ['plantillas', 'Plantillas de sticker'],
            ['kits', 'Kits'],
          ] as const
        ).map(([k, t]) => (
          <button key={k} type="button" onClick={() => setPestana(k)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${pestana === k ? 'bg-ink text-white' : 'text-ink-soft'}`}>
            {t}
          </button>
        ))}
      </div>
      {pestana === 'usuarios' ? <Usuarios /> : pestana === 'plantillas' ? <Plantillas /> : <Kits />}
    </div>
  );
}

function Usuarios() {
  const { usuario: yo } = useSesion();
  const { datos, recargar } = useCarga(() => api<Usuario[]>('/admin/usuarios'));
  const [nuevo, setNuevo] = useState(false);
  const [d, setD] = useState({ nombre: '', email: '', rol: 'OPERADOR_TOMA', institucion: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function crear(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await post('/admin/usuarios', { ...d, ...(d.institucion ? {} : { institucion: undefined }) });
      setNuevo(false);
      setD({ nombre: '', email: '', rol: 'OPERADOR_TOMA', institucion: '', password: '' });
      recargar();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }
  async function alternar(u: Usuario) {
    await api(`/admin/usuarios/${u.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !u.activo }) });
    recargar();
  }
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-bold">Usuarios</h2>
        <button type="button" className="btn-primary btn-sm" onClick={() => setNuevo(true)}>
          <Icon.plus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="tabla w-full">
          <thead className="bg-surface/60">
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th className="hidden md:table-cell">Institución</th>
              <th className="hidden md:table-cell">Alta</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {datos?.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.nombre}</td>
                <td className="text-sm text-ink-soft">{u.email}</td>
                <td>
                  <ChipRol rol={u.rol} />
                </td>
                <td className="hidden text-sm md:table-cell">{u.institucion ?? '—'}</td>
                <td className="hidden text-xs text-ink-mute md:table-cell">{fecha(u.createdAt, false)}</td>
                <td>
                  <button type="button" disabled={u.id === yo?.id} onClick={() => void alternar(u)} className={`chip ${u.activo ? 'bg-lima-100 text-lima-800' : 'bg-slate-100 text-slate-600'} disabled:cursor-default`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-5 py-3 text-xs text-ink-mute">Contraseñas con bcrypt (costo 12). Los permisos de cada rol se revisan en el servidor en cada solicitud.</p>
      <Modal abierto={nuevo} onCerrar={() => setNuevo(false)} titulo="Nuevo usuario">
        <form onSubmit={crear} className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} required />
          </div>
          <div>
            <label className="label">Correo</label>
            <input type="email" className="input" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rol</label>
              <select className="input" value={d.rol} onChange={(e) => setD({ ...d, rol: e.target.value })}>
                {Object.entries(ROLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Institución</label>
              <input className="input" value={d.institucion} onChange={(e) => setD({ ...d, institucion: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Contraseña inicial</label>
            <input type="password" className="input" value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} minLength={10} required />
          </div>
          {error ? <Aviso tono="error" titulo={error} /> : null}
          <div className="flex justify-end">
            <button className="btn-primary" disabled={cargando}>
              {cargando ? <Spinner /> : null} Crear usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Plantillas() {
  const { datos, recargar } = useCarga(() => api<Catalogos>('/catalogos'));
  const [d, setD] = useState({ nombre: '', pais: '', posiciones: [1, 2, 3, 4, 5] as number[] });
  const [error, setError] = useState('');
  async function crear(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await post('/admin/plantillas', d);
      setD({ nombre: '', pais: '', posiciones: [1, 2, 3, 4, 5] });
      recargar();
    } catch (err) {
      setError(mensaje(err));
    }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3">
        {datos?.plantillas.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="font-bold">{p.nombre}</p>
              <span className="chip bg-surface text-ink-soft">{p.pais}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <span key={n} className={`chip ${p.posiciones.includes(n) ? 'bg-celeste-100 text-celeste-700' : 'bg-surface text-ink-mute/60 line-through'}`}>
                  {n} · {DEDOS[n]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={crear} className="card h-fit space-y-3 p-5">
        <h3 className="font-bold">Nueva plantilla</h3>
        <input className="input" placeholder="Nombre, p. ej. Perú — 10 dedos" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} required />
        <input className="input" placeholder="País" value={d.pais} onChange={(e) => setD({ ...d, pais: e.target.value })} required />
        <p className="label">Casillas (posiciones ANSI/NIST)</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.posiciones.includes(n)} onChange={(e) => setD({ ...d, posiciones: e.target.checked ? [...d.posiciones, n] : d.posiciones.filter((x) => x !== n) })} />
              {n} · {DEDOS[n]}
            </label>
          ))}
        </div>
        {error ? <Aviso tono="error" titulo={error} /> : null}
        <button className="btn-primary w-full">Crear plantilla</button>
      </form>
    </div>
  );
}

function Kits() {
  const { datos } = useCarga(() => api<Catalogos>('/catalogos'));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {datos?.kits.map((k) => (
        <div key={k.id} className="card p-5">
          <p className="font-bold">{k.nombre}</p>
          <p className="text-xs text-ink-mute">{k.fabricante}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-mute">
            {k.loci.length} loci · {k.loci.filter((l) => CODIS_20.includes(l)).length}/20 CODIS
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {k.loci.map((l) => (
              <span key={l} className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${CODIS_20.includes(l) ? 'bg-lima-100 text-lima-800' : 'bg-surface text-ink-soft'}`}>
                {l}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
