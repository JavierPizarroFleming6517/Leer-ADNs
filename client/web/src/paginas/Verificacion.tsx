import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../api';
import { Escaner } from '../componentes/Escaner';
import { QrFalso } from '../componentes/QrFalso';
import { Subir } from '../componentes/Subir';
import { LeyendaMinucias, VisorHuella } from '../componentes/VisorHuella';
import { useSesion } from '../sesion';
import type { Minucia, Resumen } from '../tipos';
import { Aviso, ChipEstado, Encabezado, Hash, Icon, Spinner, mensaje } from '../ui';
import type { ResultadoQr } from './Escanear';

type Candidato = { huellaId: string; stickerCodigo: string; posicion: number; dedo: string; ancho: number; alto: number; puntaje: number; coincide: boolean; persona: { id: string; nombre: string } | null };
type ResHuella = {
  archivo: { nombre: string; sha256: string; dpi: number };
  sonda: { minucias: Minucia[]; cantidadMinucias: number; ancho: number; alto: number; png: string | null };
  umbral: number;
  comparadas: number;
  millis: number;
  coincide: boolean;
  mejores: Candidato[];
};
type ResPerfil = {
  archivo: { nombre: string; sha256: string; formato: string };
  comparados: number;
  muestras: { codigoMuestra: string; resumen: Resumen; coincidencias: { stickerCodigo: string; codigoMuestra: string; persona: { nombre: string } | null; lociComparados: number; lociIguales: number }[] }[];
};

export default function Verificacion() {
  const { puede } = useSesion();
  const modos = [
    { id: 'huella', t: 'Por huella', i: Icon.fingerprint, ok: true },
    { id: 'perfil', t: 'Por perfil genético', i: Icon.dna, ok: puede('ADMIN', 'VERIFICADOR', 'LABORATORIO') },
    { id: 'qr', t: 'Por QR', i: Icon.qr, ok: true },
  ].filter((m) => m.ok);
  const [modo, setModo] = useState('huella');
  return (
    <div>
      <Encabezado eyebrow="Base comparativa" titulo="Verificación de identidad">
        Sube una huella o un perfil genético y TrazaGen lo compara contra todo el registro. Cada consulta queda en la cadena de custodia del sticker encontrado y en la auditoría.
      </Encabezado>
      <div className="mb-6 grid gap-2 sm:inline-grid sm:grid-flow-col">
        {modos.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setModo(m.id)}
            data-testid={`modo-${m.id}`}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition ${modo === m.id ? 'border-ink bg-ink text-white shadow-lg' : 'border-line bg-white text-ink-soft hover:border-celeste-200'}`}
          >
            <m.i className={`h-5 w-5 ${modo === m.id ? 'text-lima-400' : 'text-celeste-600'}`} /> {m.t}
          </button>
        ))}
      </div>
      {modo === 'huella' ? <PorHuella /> : modo === 'perfil' ? <PorPerfil /> : <PorQr />}
    </div>
  );
}

function PorHuella() {
  const [dpi, setDpi] = useState(500);
  const [cargando, setCargando] = useState<string>('');
  const [error, setError] = useState('');
  const [r, setR] = useState<ResHuella | null>(null);
  async function subir(a: File) {
    setCargando(a.name);
    setError('');
    setR(null);
    try {
      const fd = new FormData();
      fd.append('imagen', a);
      fd.append('dpi', String(dpi));
      setR(await post<ResHuella>('/verificacion/huella', fd));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setCargando('');
    }
  }
  const mejor = r?.mejores.find((m) => m.coincide);
  const maxPuntaje = Math.max(r?.umbral ?? 40, ...(r?.mejores.map((m) => m.puntaje) ?? [0])) * 1.1;
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="card h-fit p-5">
        <h2 className="mb-1 font-bold">Huella a verificar</h2>
        <p className="mb-4 text-sm text-ink-soft">PNG, JPEG o TIFF. Se extrae la plantilla con SourceAFIS y se busca 1:N contra todas las huellas registradas.</p>
        <Subir acepta="image/png,image/jpeg,image/tiff,.tif,.tiff" titulo="Arrastra la imagen de la huella" formatos={['.png', '.jpg', '.tif']} cargando={cargando ? `Comparando ${cargando}…` : false} onArchivo={(a) => void subir(a)} testid="subir-huella-verificar" />
        <label className="mt-4 flex items-center justify-between text-sm font-semibold text-ink-soft">
          Resolución de la imagen
          <select className="input w-auto" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
            {[500, 569, 600, 1000].map((v) => (
              <option key={v} value={v}>
                {v} DPI
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-ink-mute">SourceAFIS no es invariante a escala: el DPI debe ser el de la digitalización.</p>
      </section>

      <div className="min-w-0 space-y-5">
        {error ? <Aviso tono="error" titulo="No se pudo verificar">{error}</Aviso> : null}
        {cargando ? (
          <div className="card flex flex-col items-center justify-center gap-3 py-20 text-sm text-ink-soft">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-celeste-50">
              <Icon.fingerprint className="absolute inset-3 h-10 w-10 text-celeste-600" />
              <div className="barrido absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-lima-400/40 to-transparent" />
            </div>
            Extrayendo minucias y comparando contra el registro…
          </div>
        ) : null}
        {r ? (
          <div className="aparecer space-y-5">
            {mejor ? (
              <div className="overflow-hidden rounded-2xl border-2 border-lima-400 bg-white shadow-card" data-testid="resultado-coincide">
                <div className="flex flex-wrap items-center gap-4 bg-lima-50 p-5">
                  <span className="pulso-ok flex h-14 w-14 items-center justify-center rounded-full bg-lima-400">
                    <Icon.check className="h-8 w-8 text-ink" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-lima-800">Coincidencia encontrada</p>
                    <p className="mt-1 text-xl font-bold tracking-tight">Coincide con {mejor.persona?.nombre ?? 'persona sin nombre'}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {mejor.dedo} · sticker <span className="font-mono font-semibold text-ink">{mejor.stickerCodigo}</span> · puntaje <span className="font-mono font-semibold text-ink">{mejor.puntaje.toFixed(1)}</span> (umbral {r.umbral})
                    </p>
                  </div>
                  <Link to={`/stickers/${mejor.stickerCodigo}`} className="btn-primary">
                    Abrir expediente <Icon.arrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">Huella consultada · {r.sonda.cantidadMinucias} minucias</p>
                    <div className="rounded-xl border border-line p-2">
                      <VisorHuella dataUrl={r.sonda.png ? `data:image/png;base64,${r.sonda.png}` : null} ancho={r.sonda.ancho} alto={r.sonda.alto} minucias={r.sonda.minucias} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">Huella registrada · {mejor.dedo}</p>
                    <div className="rounded-xl border border-line p-2">
                      <VisorHuella huellaId={mejor.huellaId} ancho={mejor.ancho} alto={mejor.alto} minucias={[]} mostrar={false} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-line bg-white p-6 shadow-card" data-testid="resultado-sin-coincidencias">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                    <Icon.search className="h-7 w-7 text-ink-mute" />
                  </span>
                  <div>
                    <p className="text-xl font-bold tracking-tight">Sin coincidencias</p>
                    <p className="text-sm text-ink-soft">
                      La huella no corresponde a ninguna persona registrada. Puntaje más alto {r.mejores[0]?.puntaje.toFixed(1) ?? '0'}, bajo el umbral {r.umbral}.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr]">
                  <div className="rounded-xl border border-line p-2">
                    <VisorHuella dataUrl={r.sonda.png ? `data:image/png;base64,${r.sonda.png}` : null} ancho={r.sonda.ancho} alto={r.sonda.alto} minucias={r.sonda.minucias} />
                  </div>
                  <div className="text-sm text-ink-soft">
                    <LeyendaMinucias total={r.sonda.cantidadMinucias} />
                    <p className="mt-3">Se extrajeron {r.sonda.cantidadMinucias} minucias y se compararon contra {r.comparadas} huellas en {r.millis} ms.</p>
                  </div>
                </div>
              </div>
            )}
            <section className="card p-5">
              <h3 className="mb-1 font-bold">Puntajes reales de SourceAFIS</h3>
              <p className="mb-4 text-xs text-ink-mute">
                Las 5 huellas más parecidas de {r.comparadas} comparadas en {r.millis} ms. La línea marca el umbral ({r.umbral}).
              </p>
              <ul className="space-y-2.5">
                {r.mejores.map((m) => (
                  <li key={m.huellaId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_60px] items-center gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">{m.persona?.nombre ?? '—'}</span> <span className="text-xs text-ink-mute">· {m.dedo}</span>
                    </span>
                    <span className="relative h-3 rounded-full bg-surface">
                      <span className={`absolute inset-y-0 left-0 rounded-full ${m.coincide ? 'bg-lima-400' : 'bg-celeste-200'}`} style={{ width: `${Math.max(1.5, (m.puntaje / maxPuntaje) * 100)}%` }} />
                      <span className="absolute -inset-y-1 w-0.5 bg-ink/60" style={{ left: `${(r.umbral / maxPuntaje) * 100}%` }} />
                    </span>
                    <span className={`text-right font-mono text-sm ${m.coincide ? 'font-bold text-lima-800' : 'text-ink-mute'}`}>{m.puntaje.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink-mute">
                Archivo {r.archivo.nombre} · SHA-256 <Hash valor={r.archivo.sha256} corto /> · {r.archivo.dpi} DPI
              </p>
            </section>
          </div>
        ) : !cargando ? (
          <div className="card flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-ink-mute">
            <Icon.fingerprint className="h-10 w-10 text-celeste-200" />
            El resultado de la búsqueda aparecerá aquí, con los puntajes reales del motor biométrico.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PorPerfil() {
  const [cargando, setCargando] = useState('');
  const [error, setError] = useState('');
  const [r, setR] = useState<ResPerfil | null>(null);
  async function subir(a: File) {
    setCargando(a.name);
    setError('');
    setR(null);
    try {
      const fd = new FormData();
      fd.append('archivo', a);
      setR(await post<ResPerfil>('/verificacion/perfil', fd));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setCargando('');
    }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="card h-fit p-5">
        <h2 className="mb-1 font-bold">Perfil a verificar</h2>
        <p className="mb-4 text-sm text-ink-soft">CODIS CMF, planilla XLSX o CSV. Coincidencia exacta en todos los loci comunes (mínimo 10).</p>
        <Subir acepta=".xml,.xlsx,.csv" titulo="Arrastra el archivo del perfil" formatos={['CMF .xml', '.xlsx', '.csv']} cargando={cargando ? `Comparando ${cargando}…` : false} onArchivo={(a) => void subir(a)} testid="subir-perfil-verificar" />
      </section>
      <div className="min-w-0 space-y-4">
        {error ? <Aviso tono="error" titulo="No se pudo verificar">{error}</Aviso> : null}
        {r ? (
          <div className="aparecer space-y-4">
            {r.muestras.map((m) =>
              m.coincidencias.length ? (
                m.coincidencias.map((c) => (
                  <div key={c.stickerCodigo} className="overflow-hidden rounded-2xl border-2 border-lima-400 bg-white shadow-card" data-testid="perfil-coincide">
                    <div className="flex flex-wrap items-center gap-4 bg-lima-50 p-5">
                      <span className="pulso-ok flex h-14 w-14 items-center justify-center rounded-full bg-lima-400">
                        <Icon.dna className="h-7 w-7 text-ink" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="eyebrow text-lima-800">Coincidencia · muestra consultada {m.codigoMuestra}</p>
                        <p className="mt-1 text-xl font-bold tracking-tight">Coincide con {c.persona?.nombre ?? '—'}</p>
                        <p className="text-sm text-ink-soft">
                          Sticker <span className="font-mono font-semibold text-ink">{c.stickerCodigo}</span> · muestra {c.codigoMuestra} · {c.lociIguales}/{c.lociComparados} loci idénticos
                        </p>
                      </div>
                      <Link to={`/stickers/${c.stickerCodigo}/perfil`} className="btn-primary">
                        Abrir expediente <Icon.arrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div key={m.codigoMuestra} className="rounded-2xl border-2 border-line bg-white p-5 shadow-card" data-testid="perfil-sin-coincidencias">
                  <p className="text-lg font-bold">Sin coincidencias · {m.codigoMuestra}</p>
                  <p className="text-sm text-ink-soft">
                    {m.resumen.codisPresentes}/20 loci CODIS · se comparó con {r.comparados} perfiles registrados.
                  </p>
                </div>
              ),
            )}
            <p className="text-xs text-ink-mute">
              {r.archivo.formato} · {r.archivo.nombre} · SHA-256 <Hash valor={r.archivo.sha256} corto />
            </p>
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-ink-mute">
            <Icon.dna className="h-10 w-10 text-celeste-200" />
            El resultado aparecerá aquí.
          </div>
        )}
      </div>
    </div>
  );
}

function PorQr() {
  const [camara, setCamara] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [r, setR] = useState<ResultadoQr | null>(null);
  const [cargando, setCargando] = useState(false);
  const resolver = useCallback(async (texto: string) => {
    setCargando(true);
    try {
      setR(await post<ResultadoQr>('/qr/resolver', { texto }));
      setCamara(false);
    } catch (e) {
      setR({ valido: false, motivo: mensaje(e), codigo: null });
    } finally {
      setCargando(false);
    }
  }, []);
  const lectura = useCallback((t: string) => void resolver(t), [resolver]);
  if (r && !r.valido) return <QrFalso motivo={r.motivo} codigo={r.codigo} onReintentar={() => setR(null)} />;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <section className="card p-5">
        {camara ? (
          <Escaner activo onLectura={lectura} />
        ) : (
          <button type="button" onClick={() => setCamara(true)} className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-2xl bg-ink text-celeste-100">
            <Icon.qr className="h-14 w-14 text-celeste-400" />
            <span className="mt-3 text-sm font-semibold">Activar cámara</span>
          </button>
        )}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void resolver(codigo);
          }}
        >
          <input className="input font-mono uppercase" placeholder="TG-XXXX-XXXX o URL del QR" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <button className="btn-primary" disabled={cargando || codigo.length < 4}>
            {cargando ? <Spinner /> : 'Verificar'}
          </button>
        </form>
      </section>
      <section className="card flex flex-col justify-center p-6">
        {r && r.valido ? (
          <div className="aparecer text-center">
            <span className="pulso-ok mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lima-400">
              <Icon.shield className="h-8 w-8 text-ink" />
            </span>
            <p className="mt-4 text-xl font-bold">{r.firmaVerificada ? 'QR auténtico' : 'Código registrado'}</p>
            <p className="mt-1 text-sm text-ink-soft">{r.firmaVerificada ? 'La firma Ed25519 corresponde a TrazaGen.' : 'Código ingresado a mano: existe en el registro.'}</p>
            <p className="mt-4 font-mono text-2xl font-bold">{r.codigo}</p>
            <div className="mt-2 flex justify-center">
              <ChipEstado estado={r.estado} />
            </div>
            <Link to={`/stickers/${r.codigo}`} className="btn-primary mt-6">
              Ver expediente <Icon.arrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="text-center text-sm text-ink-mute">
            <Icon.qr className="mx-auto h-10 w-10 text-celeste-200" />
            <p className="mt-2">Escanea o ingresa un código para verificar que fue emitido por TrazaGen.</p>
          </div>
        )}
      </section>
    </div>
  );
}
