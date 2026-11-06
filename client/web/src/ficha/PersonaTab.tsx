import { type FormEvent, useState } from 'react';
import { ApiError, abrir, post } from '../api';
import { Subir } from '../componentes/Subir';
import { useSesion } from '../sesion';
import type { PersonaVista } from '../tipos';
import { Aviso, Dato, Hash, Icon, Spinner, Vacio, fecha, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

const TIPOS = ['RUN', 'DNI', 'PASAPORTE', 'CEDULA', 'OTRO'];
const SEXOS = ['Femenino', 'Masculino', 'No binario', 'Prefiere no declarar'];

export default function PersonaTab({ f, recargar }: TabProps) {
  const { puede } = useSesion();
  const edita = puede('ADMIN', 'OPERADOR_TOMA') && !f.sticker.anulado;
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      {f.persona ? <FichaPersona p={f.persona} /> : edita ? <AsociarPersona codigo={f.sticker.codigo} onOk={recargar} /> : <Seccion titulo="Persona"><Vacio icono={Icon.user} titulo="Sin persona asociada" /></Seccion>}
      <Consentimiento f={f} recargar={recargar} edita={edita} />
    </div>
  );
}

function FichaPersona({ p }: { p: PersonaVista }) {
  return (
    <Seccion titulo="Persona" icono={Icon.user} acciones={<span className="chip bg-celeste-50 text-celeste-700"><Icon.lock className="h-3.5 w-3.5" /> Datos sensibles cifrados</span>}>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Dato etiqueta="Nombres" valor={p.nombres} />
        <Dato etiqueta="Apellidos" valor={p.apellidos} />
        <Dato
          etiqueta={`Documento (${p.tipoDocumento})`}
          valor={p.documentoVisible === 'oculto' ? <span className="text-ink-mute">Oculto para tu rol</span> : <span className="font-mono">{p.documento}</span>}
        />
        <Dato etiqueta="Fecha de nacimiento" valor={p.fechaNacimiento ? fecha(p.fechaNacimiento + 'T12:00:00', false) : p.anioNacimiento ? `${p.anioNacimiento} (fecha completa restringida)` : 'Restringida'} />
        <Dato etiqueta="País" valor={p.pais} />
        <Dato etiqueta="Nacionalidad" valor={p.nacionalidad} />
        <Dato etiqueta="Sexo declarado" valor={p.sexoDeclarado ?? '—'} />
        <Dato etiqueta="Institución" valor={p.institucion ?? '—'} />
      </dl>
      <p className="mt-5 rounded-xl bg-surface px-4 py-3 text-xs leading-5 text-ink-soft">
        El número de documento y la fecha de nacimiento se guardan cifrados con AES-256-GCM. Para buscar y detectar duplicados se usa un índice ciego HMAC-SHA256: la base nunca guarda el documento en claro.
      </p>
    </Seccion>
  );
}

function AsociarPersona({ codigo, onOk }: { codigo: string; onOk: () => void }) {
  const [modo, setModo] = useState<'nueva' | 'buscar'>('nueva');
  const [d, setD] = useState({ nombres: '', apellidos: '', tipoDocumento: 'PASAPORTE', numeroDocumento: '', pais: 'Chile', nacionalidad: 'Chilena', fechaNacimiento: '', sexoDeclarado: '', institucion: '' });
  const [b, setB] = useState({ tipoDocumento: 'PASAPORTE', numeroDocumento: '', pais: 'Chile' });
  const [encontrada, setEncontrada] = useState<{ persona: PersonaVista; stickers: { codigo: string }[] } | null | false>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const campo = (k: keyof typeof d) => ({ value: d[k], onChange: (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value }) });

  async function crear(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const nueva = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== '')) as Record<string, string>;
      await post(`/stickers/${codigo}/persona`, { nueva });
      onOk();
    } catch (err) {
      setError(mensaje(err));
      if (err instanceof ApiError && err.status === 409) setModo('buscar');
    } finally {
      setCargando(false);
    }
  }
  async function buscar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const r = await post<{ encontrada: boolean; persona?: PersonaVista; stickers?: { codigo: string }[] }>('/personas/buscar-documento', b);
      setEncontrada(r.encontrada ? { persona: r.persona!, stickers: r.stickers! } : false);
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }
  async function usar(id: string) {
    setCargando(true);
    try {
      await post(`/stickers/${codigo}/persona`, { personaId: id });
      onOk();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <Seccion titulo="Asociar persona" icono={Icon.user}>
      <div className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1">
        {(['nueva', 'buscar'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setModo(m)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${modo === m ? 'bg-white text-ink shadow-sm' : 'text-ink-mute'}`}>
            {m === 'nueva' ? 'Persona nueva' : 'Buscar existente'}
          </button>
        ))}
      </div>
      {error ? <Aviso tono="error" titulo={error} className="mb-4" /> : null}
      {modo === 'nueva' ? (
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-2" data-testid="form-persona">
          <div>
            <label className="label">Nombres</label>
            <input className="input" required {...campo('nombres')} name="nombres" />
          </div>
          <div>
            <label className="label">Apellidos</label>
            <input className="input" required {...campo('apellidos')} name="apellidos" />
          </div>
          <div>
            <label className="label">Tipo de documento</label>
            <select className="input" {...campo('tipoDocumento')} name="tipoDocumento">
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Número de documento</label>
            <input className="input font-mono" required {...campo('numeroDocumento')} name="numeroDocumento" />
          </div>
          <div>
            <label className="label">País del documento</label>
            <input className="input" required {...campo('pais')} name="pais" />
          </div>
          <div>
            <label className="label">Nacionalidad</label>
            <input className="input" required {...campo('nacionalidad')} name="nacionalidad" />
          </div>
          <div>
            <label className="label">Fecha de nacimiento</label>
            <input type="date" className="input" {...campo('fechaNacimiento')} name="fechaNacimiento" />
          </div>
          <div>
            <label className="label">Sexo declarado</label>
            <select className="input" {...campo('sexoDeclarado')} name="sexoDeclarado">
              <option value="">—</option>
              {SEXOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Institución</label>
            <input className="input" {...campo('institucion')} name="institucion" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 sm:col-span-2">
            <p className="text-xs text-ink-mute">El sticker se vincula una sola vez. Un segundo intento queda bloqueado y auditado.</p>
            <button type="submit" className="btn-primary" disabled={cargando} data-testid="guardar-persona">
              {cargando ? <Spinner /> : <Icon.check className="h-4 w-4" />} Asociar al sticker
            </button>
          </div>
        </form>
      ) : (
        <div>
          <form onSubmit={buscar} className="grid gap-3 sm:grid-cols-[140px_1fr_140px_auto] sm:items-end">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={b.tipoDocumento} onChange={(e) => setB({ ...b, tipoDocumento: e.target.value })}>
                {TIPOS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Número</label>
              <input className="input font-mono" value={b.numeroDocumento} onChange={(e) => setB({ ...b, numeroDocumento: e.target.value })} required />
            </div>
            <div>
              <label className="label">País</label>
              <input className="input" value={b.pais} onChange={(e) => setB({ ...b, pais: e.target.value })} required />
            </div>
            <button type="submit" className="btn-secondary" disabled={cargando}>
              <Icon.search className="h-4 w-4" /> Buscar
            </button>
          </form>
          <p className="mt-2 text-xs text-ink-mute">Búsqueda exacta por índice ciego: el servidor calcula el HMAC del documento y lo compara, sin descifrar la tabla.</p>
          {encontrada === false ? <Aviso tono="info" titulo="No hay una persona con ese documento" className="mt-4" /> : null}
          {encontrada ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
              <div>
                <p className="font-semibold">
                  {encontrada.persona.nombres} {encontrada.persona.apellidos}
                </p>
                <p className="text-xs text-ink-mute">
                  {encontrada.persona.tipoDocumento} {encontrada.persona.documento} · stickers: {encontrada.stickers.map((s) => s.codigo).join(', ') || 'ninguno'}
                </p>
              </div>
              <button type="button" className="btn-primary btn-sm" onClick={() => void usar(encontrada.persona.id)} disabled={cargando}>
                Usar esta persona
              </button>
            </div>
          ) : null}
        </div>
      )}
    </Seccion>
  );
}

function Consentimiento({ f, recargar, edita }: TabProps & { edita: boolean }) {
  const [d, setD] = useState({ versionTexto: '3.2', fechaFirma: new Date().toISOString().slice(0, 10), entidadRevisora: 'Comité Ético Científico · Servicio de Salud Metropolitano Oriente' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(false);
  async function subir(archivo: File) {
    setCargando(true);
    setError('');
    setOk('');
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      Object.entries(d).forEach(([k, v]) => fd.append(k, v));
      const r = await post<{ archivoSha256: string }>(`/stickers/${f.sticker.codigo}/consentimiento`, fd);
      setOk(r.archivoSha256);
      recargar();
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setCargando(false);
    }
  }
  return (
    <Seccion titulo="Consentimiento informado" icono={Icon.file}>
      {f.consentimientos.length ? (
        <ul className="mb-5 space-y-3">
          {f.consentimientos.map((c) => (
            <li key={c.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  Versión {c.versionTexto} · firmado {fecha(c.fechaFirma, false)}
                </p>
                {edita ? (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => void abrir(`/consentimientos/${c.id}/pdf`)}>
                    <Icon.external className="h-4 w-4" /> Ver PDF
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-ink-mute">{c.entidadRevisora}</p>
              <p className="mt-2 text-xs text-ink-mute">
                {c.archivoNombre} · SHA-256 <Hash valor={c.archivoSha256} corto />
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-ink-mute">Aún no se adjunta el consentimiento firmado.</p>
      )}
      {edita && f.persona ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
            <div>
              <label className="label">Versión</label>
              <input className="input font-mono" value={d.versionTexto} onChange={(e) => setD({ ...d, versionTexto: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de firma</label>
              <input type="date" className="input" value={d.fechaFirma} onChange={(e) => setD({ ...d, fechaFirma: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Entidad revisora</label>
            <input className="input" value={d.entidadRevisora} onChange={(e) => setD({ ...d, entidadRevisora: e.target.value })} />
          </div>
          <Subir compacto acepta="application/pdf,.pdf" titulo="Sube el PDF firmado" formatos={['.pdf · máx. 10 MB']} cargando={cargando ? 'Calculando SHA-256…' : false} onArchivo={subir} testid="subir-consentimiento" />
          {ok ? (
            <Aviso tono="ok" titulo="Consentimiento guardado">
              SHA-256 <Hash valor={ok} corto />
            </Aviso>
          ) : null}
          {error ? <Aviso tono="error" titulo={error} /> : null}
        </div>
      ) : null}
    </Seccion>
  );
}
