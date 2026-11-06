import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, descargar, post } from '../api';
import { useCarga, useSesion } from '../sesion';
import type { Catalogos } from '../tipos';
import { Aviso, Cargando, Encabezado, Icon, Modal, Spinner, Vacio, fecha, hace, mensaje } from '../ui';

type Fila = {
  id: string;
  codigo: string;
  estado: string;
  lote: string;
  plantilla: string;
  pais: string;
  tienePersona: boolean;
  huellas: number;
  tienePerfil: boolean;
  muestra: string | null;
  etapa: string | null;
  vinculado: boolean;
  actualizado: string;
};
type Lote = {
  id: string;
  codigo: string;
  cantidad: number;
  fechaFabricacion: string;
  versionDiseno: string;
  fabrica: string;
  createdAt: string;
  plantilla: { nombre: string; pais: string };
  creadoPor: { nombre: string };
  porEstado: Record<string, number>;
};

export default function Stickers() {
  const [params, setParams] = useSearchParams();
  const vista = params.get('vista') === 'lotes' ? 'lotes' : 'stickers';
  const { puede } = useSesion();
  const [crear, setCrear] = useState(false);
  return (
    <div>
      <Encabezado
        eyebrow="Inventario"
        titulo="Stickers y lotes"
        acciones={
          puede('ADMIN') ? (
            <button type="button" className="btn-primary" onClick={() => setCrear(true)} data-testid="crear-lote">
              <Icon.plus className="h-4 w-4" /> Crear lote
            </button>
          ) : null
        }
      >
        Cada sticker sale de fábrica con un QR firmado y sin datos personales. Su código es el ID dactilogenético de la persona.
      </Encabezado>
      <div className="mb-5 inline-flex rounded-xl border border-line bg-white p-1">
        {(['stickers', 'lotes'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setParams(v === 'lotes' ? { vista: 'lotes' } : {})}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${vista === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
          >
            {v === 'stickers' ? 'Stickers' : 'Lotes'}
          </button>
        ))}
      </div>
      {vista === 'stickers' ? <ListaStickers /> : <ListaLotes />}
      {crear ? <CrearLote onCerrar={() => setCrear(false)} /> : null}
    </div>
  );
}

function ListaStickers() {
  const { puede } = useSesion();
  const [lote, setLote] = useState('');
  const [pais, setPais] = useState('');
  const [q, setQ] = useState('');
  const qs = new URLSearchParams({ ...(lote && { lote }), ...(pais && { pais }), ...(q && { q }) }).toString();
  const { datos, cargando, error, recargar } = useCarga(() => api<{ items: Fila[]; filtros: { lotes: string[]; paises: string[] } }>(`/stickers?${qs}`), [qs]);
  const nav = useNavigate();
  const [objetivo, setObjetivo] = useState<Fila | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState('');
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <div className="relative min-w-[200px] flex-1">
          <Icon.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <input className="input pl-9 font-mono uppercase" placeholder="Buscar código" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={lote} onChange={(e) => setLote(e.target.value)} aria-label="Lote">
          <option value="">Todos los lotes</option>
          {datos?.filtros.lotes.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select className="input w-auto" value={pais} onChange={(e) => setPais(e.target.value)} aria-label="País">
          <option value="">Todos los países</option>
          {datos?.filtros.paises.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      {error ? <Aviso tono="error" titulo="No se pudo cargar" className="m-4">{error}</Aviso> : null}
      {cargando && !datos ? (
        <Cargando />
      ) : datos && datos.items.length === 0 ? (
        <div className="p-6">
          <Vacio icono={Icon.qr} titulo="No hay stickers con esos filtros" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabla w-full">
            <thead className="bg-surface/60">
              <tr>
                <th>Código</th>
                <th>Lote</th>
                <th className="hidden md:table-cell">Plantilla</th>
                <th>Avance</th>
                <th className="hidden lg:table-cell">Actualizado</th>
                {puede('ADMIN') ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {datos?.items.map((s) => (
                <tr key={s.id} className="cursor-pointer transition hover:bg-celeste-50/50" onClick={() => nav(`/stickers/${s.codigo}`)}>
                  <td>
                    <Link to={`/stickers/${s.codigo}`} className="font-mono text-sm font-semibold text-ink hover:text-celeste-600" onClick={(e) => e.stopPropagation()}>
                      {s.codigo}
                    </Link>
                  </td>
                  <td className="font-mono text-xs text-ink-soft">{s.lote}</td>
                  <td className="hidden text-xs text-ink-soft md:table-cell">{s.plantilla}</td>
                  <td>
                    <Avance s={s} />
                  </td>
                  <td className="hidden text-xs text-ink-mute lg:table-cell">{hace(s.actualizado)}</td>
                  {puede('ADMIN') ? (
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn-secondary btn-sm text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setErrorBorrar('');
                          setObjetivo(s);
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {objetivo ? (
        <Modal
          abierto
          titulo={`Eliminar ${objetivo.codigo}`}
          onCerrar={() => {
            if (!borrando) setObjetivo(null);
          }}
        >
          <p className="text-sm text-ink-soft">
            Se elimina este sticker, con sus huellas, perfil y vínculo.{objetivo.tienePersona ? ' La persona permanece en Personas; solo deja de estar asociada a este código.' : ''}
          </p>
          {errorBorrar ? (
            <Aviso tono="error" titulo="No se pudo eliminar" className="mt-4">
              {errorBorrar}
            </Aviso>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={borrando} onClick={() => setObjetivo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn bg-red-600 text-white hover:bg-red-700"
              disabled={borrando}
              onClick={() => {
                setBorrando(true);
                setErrorBorrar('');
                void api(`/stickers/${objetivo.codigo}`, { method: 'DELETE' })
                  .then(() => {
                    setObjetivo(null);
                    recargar();
                  })
                  .catch((e: unknown) => setErrorBorrar(mensaje(e)))
                  .finally(() => setBorrando(false));
              }}
            >
              {borrando ? <Spinner /> : null} Eliminar sticker
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Avance({ s }: { s: Fila }) {
  const pasos = [
    { ok: s.tienePersona, t: 'Persona', i: Icon.user },
    { ok: s.huellas > 0, t: `${s.huellas} huellas`, i: Icon.fingerprint },
    { ok: s.tienePerfil, t: 'Perfil genético', i: Icon.dna },
    { ok: s.vinculado, t: 'Vínculo firmado', i: Icon.shield },
  ];
  return (
    <div className="flex items-center gap-1">
      {pasos.map((p) => (
        <span key={p.t} title={p.t} className={`flex h-6 w-6 items-center justify-center rounded-md ${p.ok ? 'bg-lima-100 text-lima-800' : 'bg-surface text-ink-mute/50'}`}>
          <p.i className="h-3.5 w-3.5" />
        </span>
      ))}
    </div>
  );
}

function ListaLotes() {
  const { datos, cargando, recargar } = useCarga(() => api<Lote[]>('/lotes'));
  const { puede } = useSesion();
  const [objetivo, setObjetivo] = useState<Lote | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState('');
  if (cargando && !datos) return <Cargando />;
  if (!datos?.length) return <Vacio titulo="Aún no hay lotes" />;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {datos.map((l) => (
        <div key={l.id} className="card flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-lg font-bold">{l.codigo}</p>
              <p className="text-xs text-ink-mute">{l.plantilla.nombre}</p>
            </div>
            <span className="chip bg-surface text-ink-soft ring-1 ring-line">{l.cantidad} stickers</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-ink-mute">Fabricación</dt>
              <dd className="font-semibold">{fecha(l.fechaFabricacion, false)}</dd>
            </div>
            <div>
              <dt className="text-ink-mute">Diseño</dt>
              <dd className="font-mono font-semibold">v{l.versionDiseno}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-mute">Fábrica</dt>
              <dd className="font-semibold">{l.fabrica}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Link to={`/lotes/${l.id}/etiquetas`} className="btn-secondary btn-sm flex-1">
              <Icon.printer className="h-4 w-4" /> Etiquetas QR
            </Link>
            {puede('ADMIN') ? (
              <button type="button" className="btn-secondary btn-sm flex-1" onClick={() => void descargar(`/lotes/${l.id}/csv`, `${l.codigo}.csv`)}>
                <Icon.download className="h-4 w-4" /> CSV fábrica
              </button>
            ) : null}
            {puede('ADMIN') ? (
              <button
                type="button"
                className="btn-secondary btn-sm flex-1 text-red-700"
                onClick={() => {
                  setErrorBorrar('');
                  setObjetivo(l);
                }}
              >
                Eliminar
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {objetivo ? (
        <Modal
          abierto
          titulo={`Eliminar ${objetivo.codigo}`}
          onCerrar={() => {
            if (!borrando) setObjetivo(null);
          }}
        >
          <p className="text-sm text-ink-soft">
            Se elimina el lote y {objetivo.cantidad === 1 ? 'su sticker' : `sus ${objetivo.cantidad} stickers`}, con huellas, perfil y vínculo. La persona asociada, si la hay, permanece en Personas.
          </p>
          {errorBorrar ? (
            <Aviso tono="error" titulo="No se pudo eliminar" className="mt-4">
              {errorBorrar}
            </Aviso>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={borrando} onClick={() => setObjetivo(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn bg-red-600 text-white hover:bg-red-700"
              disabled={borrando}
              onClick={() => {
                setBorrando(true);
                setErrorBorrar('');
                void api(`/lotes/${objetivo.id}`, { method: 'DELETE' })
                  .then(() => {
                    setObjetivo(null);
                    recargar();
                  })
                  .catch((e: unknown) => setErrorBorrar(mensaje(e)))
                  .finally(() => setBorrando(false));
              }}
            >
              {borrando ? <Spinner /> : null} Eliminar lote
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function CrearLote({ onCerrar }: { onCerrar: () => void }) {
  const nav = useNavigate();
  const { datos } = useCarga(() => api<Catalogos>('/catalogos'));
  const [f, setF] = useState({ plantillaId: '', cantidad: 5, fechaFabricacion: new Date().toISOString().slice(0, 10), versionDiseno: '2.1', fabrica: 'Adhesivos Médicos del Pacífico S.A. · Planta Quilicura' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const plantillaId = f.plantillaId || datos?.plantillas[0]?.id || '';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const l = await post<{ id: string }>('/lotes', { ...f, plantillaId, cantidad: Number(f.cantidad) });
      nav(`/lotes/${l.id}/etiquetas?nuevo=1`);
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }
  return (
    <Modal abierto onCerrar={onCerrar} titulo="Crear lote de stickers">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className="label">Plantilla</label>
          <select className="input" value={plantillaId} onChange={(e) => setF({ ...f, plantillaId: e.target.value })} data-testid="lote-plantilla">
            {datos?.plantillas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Cantidad</label>
            <input type="number" min={1} max={500} className="input" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: Number(e.target.value) })} data-testid="lote-cantidad" />
          </div>
          <div>
            <label className="label">Fecha de fabricación</label>
            <input type="date" className="input" value={f.fechaFabricacion} onChange={(e) => setF({ ...f, fechaFabricacion: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div>
            <label className="label">Versión diseño</label>
            <input className="input font-mono" value={f.versionDiseno} onChange={(e) => setF({ ...f, versionDiseno: e.target.value })} />
          </div>
          <div>
            <label className="label">Fábrica</label>
            <input className="input" value={f.fabrica} onChange={(e) => setF({ ...f, fabrica: e.target.value })} />
          </div>
        </div>
        <Aviso tono="info" titulo="Qué se genera">
          Un código aleatorio por sticker (TG-XXXX-XXXX, Crockford base32), su QR firmado con Ed25519 y un evento de fabricación en la cadena de custodia de cada uno.
        </Aviso>
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={cargando || !plantillaId} data-testid="lote-generar">
            {cargando ? <Spinner /> : <Icon.qr className="h-4 w-4" />} Generar lote
          </button>
        </div>
      </form>
    </Modal>
  );
}
