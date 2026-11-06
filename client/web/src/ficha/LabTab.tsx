import { type FormEvent, useState } from 'react';
import { api, descargar, post } from '../api';
import { useCarga, useSesion } from '../sesion';
import type { Catalogos } from '../tipos';
import { ETAPAS_LAB, NOMBRE_ETAPA } from '../tipos';
import { Aviso, Dato, Hash, Icon, Spinner, Vacio, bytes, fecha, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

const SELLOS = [
  { v: 'INTACTO', t: 'Intacto', c: 'border-lima-400 bg-lima-50' },
  { v: 'DANADO', t: 'Dañado', c: 'border-amber-300 bg-amber-50' },
  { v: 'AUSENTE', t: 'Ausente', c: 'border-red-300 bg-red-50' },
];

export default function LabTab({ f, recargar }: TabProps) {
  const { puede } = useSesion();
  const edita = puede('ADMIN', 'LABORATORIO');
  const eventos = f.custodia.eventos;
  const indice = f.muestra ? ETAPAS_LAB.indexOf(f.muestra.etapa) : -1;
  const siguiente = f.muestra ? ETAPAS_LAB[indice + 1] : 'RECEPCION_LAB';

  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <Seccion titulo="Etapas del laboratorio" icono={Icon.flask} acciones={f.muestra ? <span className="chip bg-ink font-mono text-white">{f.muestra.codigo}</span> : null}>
        <ol className="relative space-y-1">
          {ETAPAS_LAB.map((e, i) => {
            const ev = [...eventos].reverse().find((x) => x.tipo === e);
            const hecho = i <= indice;
            const proxima = e === siguiente;
            return (
              <li key={e} className="relative flex gap-4 pb-4 last:pb-0">
                {i < ETAPAS_LAB.length - 1 ? <span className={`absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5 ${hecho ? 'bg-lima-400' : 'bg-line'}`} /> : null}
                <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${hecho ? 'bg-lima-400 text-ink' : proxima ? 'bg-celeste-600 text-white ring-4 ring-celeste-100' : 'border border-line bg-white text-ink-mute'}`}>
                  {hecho ? <Icon.check className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className={`text-sm font-semibold ${hecho || proxima ? 'text-ink' : 'text-ink-mute'}`}>{NOMBRE_ETAPA[e]}</p>
                  {ev ? (
                    <div className="mt-1 text-xs text-ink-soft">
                      <p>
                        {fecha(ev.fecha)} · {ev.responsableNombre}
                      </p>
                      <DetalleEtapa detalle={ev.detalle} />
                      {ev.archivoSha256 ? (
                        <p className="mt-1 text-ink-mute">
                          Archivo SHA-256 <Hash valor={ev.archivoSha256} corto />
                        </p>
                      ) : null}
                    </div>
                  ) : proxima ? (
                    <p className="text-xs text-ink-mute">Siguiente etapa</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {f.muestra ? (
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
            <Dato etiqueta="Laboratorio" valor={f.muestra.laboratorio} />
            <Dato etiqueta="Sello" valor={SELLOS.find((s) => s.v === f.muestra!.estadoSello)?.t} />
            <Dato etiqueta="ADN" valor={f.muestra.adnUgMl !== null ? `${f.muestra.adnUgMl} µg/ml` : '—'} />
            <Dato etiqueta="Kit" valor={f.muestra.kit ? `${f.muestra.kit}${f.muestra.loteKit ? ` · lote ${f.muestra.loteKit}` : ''}` : '—'} />
            <Dato etiqueta="Equipos" valor={f.muestra.equipos ?? '—'} />
            <Dato etiqueta="Tubos almacenados" valor={f.muestra.tubosAlmacenados ?? '—'} />
            <Dato etiqueta="Material restante" valor={f.muestra.materialRestante ? 'Sí' : 'No (finalizado)'} />
            <Dato etiqueta="En etapa desde" valor={fecha(f.muestra.etapaDesde, false)} />
          </dl>
        ) : null}
      </Seccion>

      <div className="space-y-5">
        {edita ? (
          f.muestra?.materialRestante === false ? (
            <Aviso tono="info" titulo="Muestra finalizada">No queda material en el adhesivo. El registro se conserva.</Aviso>
          ) : siguiente === 'RECEPCION_LAB' ? (
            f.sticker.estado === 'NUEVO' ? (
              <Seccion titulo="Recepción"><Vacio icono={Icon.box} titulo="El sticker aún no tiene toma ni huellas" /></Seccion>
            ) : (
              <FormRecepcion codigo={f.sticker.codigo} recargar={recargar} />
            )
          ) : siguiente && siguiente !== 'PERFIL_CARGADO' ? (
            <FormEtapa key={siguiente} etapa={siguiente} codigo={f.sticker.codigo} recargar={recargar} />
          ) : siguiente === 'PERFIL_CARGADO' ? (
            <Aviso tono="info" titulo="Etapas completas">Carga el perfil genético en la pestaña «Perfil genético».</Aviso>
          ) : null
        ) : null}
        {edita && f.muestra && f.muestra.materialRestante ? <Adjuntar codigo={f.sticker.codigo} recargar={recargar} /> : null}
        <Seccion titulo="Archivos del laboratorio" icono={Icon.file}>
          {f.adjuntos.length ? (
            <ul className="space-y-2">
              {f.adjuntos.map((a) => (
                <li key={a.id} className="rounded-xl border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{a.nombre}</p>
                    {edita ? (
                      <button type="button" className="btn-ghost btn-sm px-2" onClick={() => void descargar(`/archivos/${a.id}`, a.nombre)} title="Descargar sin modificar">
                        <Icon.download className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-ink-mute">
                    {a.etapaNombre ?? '—'} · {bytes(a.tamano)} · {a.interpretado ? 'interpretado (perfil STR)' : 'almacenado, no interpretado'}
                  </p>
                  <p className="text-xs text-ink-mute">
                    SHA-256 <Hash valor={a.sha256} corto />
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-mute">Sin archivos adjuntos.</p>
          )}
        </Seccion>
        {edita && f.muestra?.materialRestante && indice >= 1 ? <Finalizar codigo={f.sticker.codigo} recargar={recargar} /> : null}
      </div>
    </div>
  );
}

function DetalleEtapa({ detalle }: { detalle: Record<string, unknown> }) {
  const etiquetas: Record<string, string> = {
    codigoMuestra: 'Muestra',
    laboratorio: 'Laboratorio',
    estadoSello: 'Sello',
    metodo: 'Método',
    equipos: 'Equipos',
    adnUgMl: 'ADN (µg/ml)',
    kit: 'Kit',
    loteKit: 'Lote kit',
    software: 'Software',
    analista: 'Analista',
    tubosAlmacenados: 'Tubos',
    archivo: 'Archivo',
    codis: 'CODIS',
    formato: 'Formato',
    materialAgotado: 'Material agotado',
  };
  const items = Object.entries(detalle).filter(([k, v]) => etiquetas[k] && v !== null && v !== undefined && v !== '');
  if (!items.length) return null;
  return (
    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
      {items.map(([k, v]) => (
        <span key={k}>
          <span className="text-ink-mute">{etiquetas[k]}:</span> <span className="font-medium text-ink">{k === 'estadoSello' ? SELLOS.find((x) => x.v === v)?.t ?? String(v) : String(v === true ? 'sí' : v)}</span>
        </span>
      ))}
    </p>
  );
}

function ElegirArchivo({ onArchivo, texto, deshabilitado = false }: { onArchivo: (f: File | null) => void; texto: string; deshabilitado?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm transition hover:border-celeste-200 hover:bg-celeste-50/50 ${deshabilitado ? 'pointer-events-none opacity-60' : ''}`}>
      <span className="btn-secondary btn-sm pointer-events-none">
        <Icon.upload className="h-4 w-4" /> Elegir archivo
      </span>
      <span className="min-w-0 truncate text-ink-soft">{texto}</span>
      <input
        type="file"
        className="hidden"
        disabled={deshabilitado}
        onChange={(e) => {
          onArchivo(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function ArchivoOpcional({ archivo, setArchivo }: { archivo: File | null; setArchivo: (f: File | null) => void }) {
  return (
    <div>
      <label className="label">Archivo de la etapa (opcional)</label>
      <ElegirArchivo onArchivo={setArchivo} texto={archivo ? archivo.name : 'Ningún archivo seleccionado'} />
      {archivo ? <p className="mt-1 text-xs text-ink-mute">Se guardará sin modificar, con su SHA-256 en la cadena de custodia.</p> : null}
    </div>
  );
}

function FormRecepcion({ codigo, recargar }: { codigo: string; recargar: () => void }) {
  const [d, setD] = useState({ laboratorio: 'GenLab Santiago · Laboratorio de Genética Forense', estadoSello: 'INTACTO', observaciones: '' });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(d).forEach(([k, v]) => v && fd.append(k, v));
      if (archivo) fd.append('archivo', archivo);
      await post(`/stickers/${codigo}/laboratorio/recepcion`, fd);
      recargar();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }
  return (
    <Seccion titulo="Registrar recepción" icono={Icon.box}>
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label className="label">Laboratorio</label>
          <input className="input" value={d.laboratorio} onChange={(e) => setD({ ...d, laboratorio: e.target.value })} required />
        </div>
        <div>
          <label className="label">Estado del sello</label>
          <div className="grid grid-cols-3 gap-2">
            {SELLOS.map((s) => (
              <button key={s.v} type="button" onClick={() => setD({ ...d, estadoSello: s.v })} className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${d.estadoSello === s.v ? s.c : 'border-line text-ink-mute'}`}>
                {s.t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Observaciones</label>
          <input className="input" value={d.observaciones} onChange={(e) => setD({ ...d, observaciones: e.target.value })} />
        </div>
        <ArchivoOpcional archivo={archivo} setArchivo={setArchivo} />
        {error ? <Aviso tono="error" titulo={error} /> : null}
        <button type="submit" className="btn-primary w-full" disabled={cargando}>
          {cargando ? <Spinner /> : <Icon.check className="h-4 w-4" />} Recibir y asignar código de muestra
        </button>
      </form>
    </Seccion>
  );
}

const CAMPOS: Record<string, { k: string; t: string; tipo?: string; def?: string; req?: boolean }[]> = {
  EXTRACCION: [
    { k: 'metodo', t: 'Método de extracción', def: 'Orgánica (fenol-cloroformo) desde adhesivo', req: true },
    { k: 'equipos', t: 'Equipos', def: 'Termobloque Eppendorf · Centrífuga 5424' },
  ],
  CUANTIFICACION: [
    { k: 'adnUgMl', t: 'Cantidad de ADN (µg/ml)', tipo: 'number', def: '0.042', req: true },
    { k: 'metodo', t: 'Método', def: 'qPCR · Quantifiler Trio' },
  ],
  AMPLIFICACION: [
    { k: 'kit', t: 'Kit', req: true },
    { k: 'loteKit', t: 'Lote del kit', def: 'GF-2611-0457' },
    { k: 'equipos', t: 'Termociclador', def: 'Veriti 96-Well' },
  ],
  ELECTROFORESIS: [{ k: 'equipos', t: 'Analizador genético', def: 'SeqStudio 24 Flex' }],
  INTERPRETACION: [
    { k: 'software', t: 'Software', def: 'GeneMapper ID-X 1.6' },
    { k: 'analista', t: 'Analista', def: 'Dra. Valentina Soto' },
    { k: 'tubosAlmacenados', t: 'Tubos almacenados', tipo: 'number', def: '2' },
  ],
};

function FormEtapa({ etapa, codigo, recargar }: { etapa: string; codigo: string; recargar: () => void }) {
  const campos = CAMPOS[etapa] ?? [];
  const { datos: cat } = useCarga(() => api<Catalogos>('/catalogos'));
  const [d, setD] = useState<Record<string, string>>(() => Object.fromEntries(campos.map((c) => [c.k, c.def ?? ''])));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('etapa', etapa);
      const kit = d.kit || cat?.kits.find((k) => k.nombre === 'GlobalFiler')?.nombre || '';
      Object.entries({ ...d, ...(etapa === 'AMPLIFICACION' ? { kit } : {}) }).forEach(([k, v]) => v !== '' && fd.append(k, v));
      if (archivo) fd.append('archivo', archivo);
      await post(`/stickers/${codigo}/laboratorio/etapa`, fd);
      recargar();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }
  return (
    <Seccion titulo={`Registrar: ${NOMBRE_ETAPA[etapa]}`} icono={Icon.pen}>
      <form onSubmit={enviar} className="space-y-3" data-testid={`form-etapa-${etapa}`}>
        {campos.map((c) =>
          c.k === 'kit' ? (
            <div key={c.k}>
              <label className="label">{c.t}</label>
              <select className="input" value={d.kit || 'GlobalFiler'} onChange={(e) => setD({ ...d, kit: e.target.value })}>
                {cat?.kits.map((k) => (
                  <option key={k.id} value={k.nombre}>
                    {k.nombre} · {k.loci.length} loci
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div key={c.k}>
              <label className="label">{c.t}</label>
              <input className="input" type={c.tipo ?? 'text'} step="any" value={d[c.k] ?? ''} onChange={(e) => setD({ ...d, [c.k]: e.target.value })} required={c.req} />
            </div>
          ),
        )}
        <ArchivoOpcional archivo={archivo} setArchivo={setArchivo} />
        {error ? <Aviso tono="error" titulo={error} /> : null}
        <button type="submit" className="btn-primary w-full" disabled={cargando} data-testid="registrar-etapa">
          {cargando ? <Spinner /> : <Icon.check className="h-4 w-4" />} Registrar {NOMBRE_ETAPA[etapa].toLowerCase()}
        </button>
        <p className="text-center text-xs text-ink-mute">Queda como evento en la cadena de custodia, con el hash del archivo si lo adjuntas.</p>
      </form>
    </Seccion>
  );
}

function Adjuntar({ codigo, recargar }: { codigo: string; recargar: () => void }) {
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <Seccion titulo="Adjuntar archivo" icono={Icon.upload}>
      <p className="mb-3 text-xs text-ink-soft">.fsa, .hid, PDF de GeneMapper, CSV de qPCR, archivos de variantes… Se guardan sin modificar, marcados como «almacenado, no interpretado».</p>
      <ElegirArchivo
        deshabilitado={cargando}
        texto={cargando ? 'Subiendo…' : 'Ningún archivo seleccionado'}
        onArchivo={async (a) => {
          if (!a) return;
          setCargando(true);
          setMsg(null);
          try {
            const fd = new FormData();
            fd.append('archivo', a);
            const r = await post<{ sha256: string }>(`/stickers/${codigo}/laboratorio/adjuntos`, fd);
            setMsg({ ok: true, t: `${a.name} guardado · SHA-256 ${r.sha256.slice(0, 16)}…` });
            recargar();
          } catch (err) {
            setMsg({ ok: false, t: mensaje(err) });
          } finally {
            setCargando(false);
          }
        }}
      />
      {cargando ? <p className="mt-2 flex items-center gap-2 text-xs text-ink-mute"><Spinner className="h-3 w-3" /> Subiendo…</p> : null}
      {msg ? <p className={`mt-2 text-xs font-medium ${msg.ok ? 'text-lima-800' : 'text-red-700'}`}>{msg.t}</p> : null}
    </Seccion>
  );
}

function Finalizar({ codigo, recargar }: { codigo: string; recargar: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);
  return (
    <div className="rounded-2xl border border-dashed border-line p-4">
      {confirmar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">¿Confirmas que no queda material en el adhesivo?</p>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmar(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-dark btn-sm"
              disabled={cargando}
              onClick={async () => {
                setCargando(true);
                try {
                  await post(`/stickers/${codigo}/laboratorio/finalizar`, {});
                  recargar();
                } finally {
                  setCargando(false);
                }
              }}
            >
              Finalizar muestra
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost btn-sm w-full" onClick={() => setConfirmar(true)}>
          Marcar material agotado (Finalizado)
        </button>
      )}
    </div>
  );
}
