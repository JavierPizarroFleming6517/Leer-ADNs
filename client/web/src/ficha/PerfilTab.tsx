import { type FormEvent, useState } from 'react';
import { api, descargar, post } from '../api';
import { Subir } from '../componentes/Subir';
import { GrillaMarcadores, Indicadores, Leyenda, VisorJson } from '../perfil';
import { useCarga, useSesion } from '../sesion';
import type { Catalogos, Resumen } from '../tipos';
import { Aviso, Dato, Hash, Icon, Spinner, Vacio, bytes, fecha, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

type Resultado = {
  codigoMuestra: string;
  formato: string;
  kit: string;
  laboratorio: string;
  resumen: Resumen;
  faltantesKit: string[];
  coincidencias: { stickerCodigo: string; codigoMuestra: string; persona: { nombre: string } | null; lociComparados: number }[];
  archivoSha256: string;
};

// El laboratorio es externo: TrazaGen registra el envío del sticker y recibe el resultado (perfil STR).
export default function PerfilTab({ f, recargar }: TabProps) {
  const { puede } = useSesion();
  const edita = puede('ADMIN', 'LABORATORIO', 'OPERADOR_TOMA') && !f.sticker.anulado;
  const lab = f.laboratorio;
  const [rechazo, setRechazo] = useState<{ archivo: string; motivo: string } | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const avisos = (
    <>
      {rechazo ? (
        <div className="aparecer overflow-hidden rounded-2xl border border-red-200 bg-red-50" data-testid="perfil-rechazado">
          <div className="flex gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
              <Icon.x className="h-6 w-6" />
            </span>
            <div className="text-sm text-red-900">
              <p className="text-base font-bold">Archivo rechazado</p>
              <p className="mt-1">{rechazo.motivo}</p>
              <p className="mt-2 text-xs text-red-800/80">{rechazo.archivo} · el intento quedó en la auditoría. No se guardó ningún dato del archivo.</p>
            </div>
          </div>
        </div>
      ) : null}
      {resultado ? (
        <div className="aparecer space-y-3" data-testid="perfil-aceptado">
          <Aviso tono="ok" titulo={`Perfil aceptado · ${resultado.resumen.codisPresentes}/20 CODIS · ${resultado.laboratorio}`}>
            {resultado.formato} con SPECIMENID {resultado.codigoMuestra}, validado contra el kit {resultado.kit}. SHA-256 del archivo <Hash valor={resultado.archivoSha256} corto />
          </Aviso>
          {resultado.coincidencias.length ? (
            <Aviso tono="alerta" titulo="Coincide con un perfil ya registrado">
              {resultado.coincidencias.map((c) => (
                <span key={c.stickerCodigo} className="block">
                  Sticker <span className="font-mono">{c.stickerCodigo}</span> {c.persona ? `(${c.persona.nombre})` : ''} · {c.lociComparados} loci idénticos
                </span>
              ))}
            </Aviso>
          ) : (
            <Aviso tono="ok" titulo="Sin coincidencias en el registro">El perfil se comparó con todos los perfiles registrados y no coincide con ninguno.</Aviso>
          )}
          {resultado.faltantesKit.length ? <Aviso tono="alerta" titulo="Loci del kit sin dato">{resultado.faltantesKit.join(', ')}</Aviso> : null}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-5">
      <Circuito f={f} />
      {avisos}
      {f.perfil ? (
        <PerfilCargado f={f} recargar={recargar} edita={edita} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
          {!lab ? (
            <Envio f={f} recargar={recargar} edita={edita} />
          ) : (
            <CargarResultado
              f={f}
              edita={edita}
              onResultado={(r) => {
                setRechazo(null);
                setResultado(r);
                recargar();
              }}
              onRechazo={(r) => {
                setResultado(null);
                setRechazo(r);
              }}
            />
          )}
          <Seccion titulo="Validaciones al recibir el resultado" icono={Icon.shield}>
            <ul className="space-y-3 text-sm">
              {[
                ['Custodia', `El SPECIMENID (o nombre de muestra) del archivo debe ser ${f.sticker.codigo}, el código de este sticker. Si no, se rechaza.`],
                ['Kit', 'Los loci deben corresponder al kit que declara el laboratorio.'],
                ['Formato', 'CODIS CMF XML (sin DTD ni entidades), planilla XLSX o CSV; máximo 5 MB.'],
                ['Registro', 'Se compara contra todos los perfiles registrados (coincidencia exacta, mínimo 10 loci).'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-lima-600" />
                  <span>
                    <span className="font-semibold">{t}.</span> <span className="text-ink-soft">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-xs leading-5 text-ink-soft">
              El laboratorio es externo: TrazaGen no registra sus procesos internos. Registra a quién se envió el sticker y recibe el resultado, con el hash del archivo original en la cadena de custodia.
            </p>
          </Seccion>
        </div>
      )}
    </div>
  );
}

// Recorrido del sticker fuera de TrazaGen: enviado → resultado recibido → material.
function Circuito({ f }: { f: TabProps['f'] }) {
  const lab = f.laboratorio;
  const pasos = [
    { ok: Boolean(lab), t: 'Enviado al laboratorio', d: lab ? `${fecha(lab.enviado, false)} · ${lab.destino}` : 'Pendiente' },
    {
      ok: Boolean(f.perfil),
      t: 'Resultado recibido',
      d: f.perfil ? `${fecha(f.perfil.cargado, false)} · ${f.perfil.kit}` : lab ? `Esperando · ${lab.diasEsperando ?? 0} ${lab.diasEsperando === 1 ? 'día' : 'días'}` : '—',
    },
    { ok: f.perfil ? !f.perfil.materialRestante : false, t: 'Material', d: f.perfil ? (f.perfil.materialRestante ? 'Queda material en el adhesivo' : 'Agotado (informado por el laboratorio)') : '—' },
  ];
  return (
    <section className="card p-5">
      <p className="eyebrow mb-3">Laboratorio externo</p>
      <ol className="grid gap-3 sm:grid-cols-3">
        {pasos.map((p, i) => (
          <li key={p.t} className="flex items-start gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.ok ? 'bg-lima-400 text-ink' : 'border border-line bg-white text-ink-mute'}`}>
              {p.ok ? <Icon.check className="h-4 w-4" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{p.t}</span>
              <span className="block truncate text-xs text-ink-mute">{p.d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Envio({ f, recargar, edita }: TabProps & { edita: boolean }) {
  const [d, setD] = useState({ destino: 'GenLab Santiago · Laboratorio de Genética Forense', transportista: 'Courier clínico con cadena de frío', sello: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const listo = Boolean(f.toma && f.huellas.length);
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await post(`/stickers/${f.sticker.codigo}/envio`, { destino: d.destino, transportista: d.transportista, ...(d.sello ? { sello: d.sello } : {}) });
      recargar();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }
  return (
    <Seccion titulo="Envío al laboratorio" icono={Icon.box}>
      {!listo ? (
        <Vacio icono={Icon.box} titulo="Aún no se puede enviar">
          El sticker se envía al laboratorio después de registrar la toma y al menos una huella.
        </Vacio>
      ) : !edita ? (
        <Vacio icono={Icon.box} titulo="Envío pendiente" />
      ) : (
        <form onSubmit={enviar} className="space-y-3" data-testid="form-envio">
          <div>
            <label className="label">Laboratorio de destino</label>
            <input className="input" value={d.destino} onChange={(e) => setD({ ...d, destino: e.target.value })} required minLength={2} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Transportista</label>
              <input className="input" value={d.transportista} onChange={(e) => setD({ ...d, transportista: e.target.value })} />
            </div>
            <div>
              <label className="label">N.º de sello de la bolsa</label>
              <input className="input font-mono" value={d.sello} onChange={(e) => setD({ ...d, sello: e.target.value })} placeholder="SB-000000" />
            </div>
          </div>
          {error ? <Aviso tono="error" titulo={error} /> : null}
          <button type="submit" className="btn-primary w-full" disabled={cargando} data-testid="registrar-envio">
            {cargando ? <Spinner /> : <Icon.arrowRight className="h-4 w-4" />} Registrar envío
          </button>
          <p className="text-center text-xs text-ink-mute">Queda como evento en la cadena de custodia: quién envió, a qué laboratorio y con qué sello.</p>
        </form>
      )}
    </Seccion>
  );
}

function CargarResultado({
  f,
  edita,
  onResultado,
  onRechazo,
}: {
  f: TabProps['f'];
  edita: boolean;
  onResultado: (r: Resultado) => void;
  onRechazo: (r: { archivo: string; motivo: string }) => void;
}) {
  const lab = f.laboratorio!;
  const { datos: cat } = useCarga(() => api<Catalogos>('/catalogos'));
  const [kit, setKit] = useState('GlobalFiler');
  const [laboratorio, setLaboratorio] = useState(lab.destino);
  const [material, setMaterial] = useState(true);
  const [cargando, setCargando] = useState(false);

  async function subir(a: File) {
    setCargando(true);
    try {
      const fd = new FormData();
      fd.append('archivo', a);
      fd.append('kit', kit);
      fd.append('laboratorio', laboratorio);
      fd.append('materialRestante', String(material));
      onResultado(await post<Resultado>(`/stickers/${f.sticker.codigo}/perfil`, fd));
    } catch (e) {
      onRechazo({ archivo: a.name, motivo: mensaje(e) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <Seccion titulo="Resultado del laboratorio" icono={Icon.dna}>
      <dl className="mb-4 grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-3">
        <Dato etiqueta="Enviado" valor={fecha(lab.enviado)} />
        <Dato etiqueta="Destino" valor={lab.destino} />
        <Dato etiqueta="Sello" valor={<span className="font-mono">{lab.sello ?? '—'}</span>} />
      </dl>
      {edita ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Kit que usó el laboratorio</label>
              <select className="input" value={kit} onChange={(e) => setKit(e.target.value)} data-testid="kit-perfil">
                {(cat?.kits ?? [{ id: 'gf', nombre: 'GlobalFiler', loci: [] }]).map((k) => (
                  <option key={k.id} value={k.nombre}>
                    {k.nombre}
                    {k.loci.length ? ` · ${k.loci.length} loci` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Laboratorio</label>
              <input className="input" value={laboratorio} onChange={(e) => setLaboratorio(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={material} onChange={(e) => setMaterial(e.target.checked)} />
            El laboratorio informa que queda material en el adhesivo
          </label>
          <Subir
            acepta=".xml,.xlsx,.csv"
            titulo="Arrastra el archivo del laboratorio o haz clic"
            formatos={['CODIS CMF · .xml', 'Planilla · .xlsx', 'Tabla · .csv']}
            cargando={cargando ? 'Validando custodia, kit y registro…' : false}
            onArchivo={(a) => void subir(a)}
            testid="subir-perfil"
          />
        </div>
      ) : (
        <Vacio icono={Icon.dna} titulo="Esperando el resultado del laboratorio" />
      )}
    </Seccion>
  );
}

function PerfilCargado({ f, recargar, edita }: TabProps & { edita: boolean }) {
  const p = f.perfil!;
  const [agotando, setAgotando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  return (
    <div className="space-y-5">
      <Seccion
        titulo={`Perfil STR · ${p.laboratorio ?? 'laboratorio externo'}`}
        icono={Icon.dna}
        acciones={
          p.archivoId ? (
            <button type="button" className="btn-secondary btn-sm" onClick={() => void descargar(`/archivos/${p.archivoId}`, p.archivoNombre)}>
              <Icon.download className="h-4 w-4" /> Archivo original
            </button>
          ) : null
        }
      >
        <Indicadores resumen={p.resumen} />
        <dl className="mt-5 grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="Kit" valor={p.kit} />
          <Dato etiqueta="Formato de origen" valor={p.formato} />
          <Dato etiqueta="Recibido" valor={fecha(p.cargado)} />
          <Dato etiqueta="SPECIMENID" valor={<span className="font-mono">{p.codigoMuestra}</span>} />
        </dl>
        <p className="mt-2 text-xs text-ink-mute">
          {p.archivoNombre} · SHA-256 <Hash valor={p.archivoSha256} corto />
        </p>
        <div className="mt-5 space-y-4">
          {p.marcadores ? (
            <>
              <GrillaMarcadores marcadores={p.marcadores} />
              <Leyenda />
              <VisorJson titulo="JSON normalizado del perfil" valor={p.marcadores} />
            </>
          ) : (
            <Aviso tono="info" titulo="Tu rol ve el resumen del perfil, no los alelos">
              Los genotipos completos solo son visibles para administración.
            </Aviso>
          )}
        </div>
      </Seccion>

      <div className="grid gap-5 xl:grid-cols-2">
        <Seccion titulo="Material en el adhesivo" icono={Icon.box}>
          {p.materialRestante ? (
            <>
              <p className="text-sm text-ink-soft">El laboratorio informó que queda material: el sticker está «En uso».</p>
              {edita ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm mt-4"
                  disabled={agotando}
                  onClick={async () => {
                    setAgotando(true);
                    try {
                      await post(`/stickers/${f.sticker.codigo}/laboratorio/material-agotado`, {});
                      recargar();
                    } finally {
                      setAgotando(false);
                    }
                  }}
                >
                  {agotando ? <Spinner /> : null} El laboratorio informa material agotado
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-soft">Sin material remanente (informado por el laboratorio). El sticker está «Finalizado» y su registro se conserva.</p>
          )}
        </Seccion>

        <Seccion titulo="Archivos del laboratorio" icono={Icon.file}>
          {f.adjuntos.length ? (
            <ul className="space-y-2">
              {f.adjuntos.map((a) => (
                <li key={a.id} className="rounded-xl border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{a.nombre}</p>
                    {p.archivoId ? (
                      <button type="button" className="btn-ghost btn-sm px-2" onClick={() => void descargar(`/archivos/${a.id}`, a.nombre)} title="Descargar sin modificar">
                        <Icon.download className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-ink-mute">
                    {bytes(a.tamano)} · {a.interpretado ? 'interpretado (perfil STR)' : 'almacenado, no interpretado'} · SHA-256 <Hash valor={a.sha256} corto />
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-mute">Sin archivos.</p>
          )}
          {edita ? (
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm transition hover:border-celeste-200 hover:bg-celeste-50/50">
              <span className="btn-secondary btn-sm pointer-events-none">
                <Icon.upload className="h-4 w-4" /> Adjuntar archivo
              </span>
              <span className="min-w-0 truncate text-xs text-ink-mute">{subiendo ? 'Subiendo…' : 'Informe PDF, .fsa, CSV de qPCR… (se guarda sin modificar)'}</span>
              <input
                type="file"
                className="hidden"
                disabled={subiendo}
                onChange={async (e) => {
                  const a = e.target.files?.[0];
                  e.target.value = '';
                  if (!a) return;
                  setSubiendo(true);
                  setMsg(null);
                  try {
                    const fd = new FormData();
                    fd.append('archivo', a);
                    const r = await post<{ sha256: string }>(`/stickers/${f.sticker.codigo}/laboratorio/adjuntos`, fd);
                    setMsg({ ok: true, t: `${a.name} guardado · SHA-256 ${r.sha256.slice(0, 16)}…` });
                    recargar();
                  } catch (err) {
                    setMsg({ ok: false, t: mensaje(err) });
                  } finally {
                    setSubiendo(false);
                  }
                }}
              />
            </label>
          ) : null}
          {msg ? <p className={`mt-2 text-xs font-medium ${msg.ok ? 'text-lima-800' : 'text-red-700'}`}>{msg.t}</p> : null}
        </Seccion>
      </div>
    </div>
  );
}
