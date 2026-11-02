import { type DragEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ApiError, api, clearToken, getToken, setToken } from './api';
import { GrillaMarcadores, Indicadores, Leyenda, VisorJson } from './perfil';
import { type Analisis, type DatosPersona, NOMBRE_FORMATO, type Persona } from './types';
import { Aviso, DESARROLLADOR, HeliceFondo, Icon, Marca, PRODUCTO, Spinner } from './ui';

type QrVista = { nombreCompleto: string; identificador: string; url: string; imagen: string };

function mensaje(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

async function crearQr(url: string) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 640,
    color: { dark: '#0B2F45', light: '#FFFFFF' },
  });
}

function bytes(n: number) {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

function fecha(iso: string) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

// ---------------------------------------------------------------- Login

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const r = await api<{ accessToken: string; role: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (r.role !== 'ADMIN') {
        setError('Esta contraseña corresponde al lector, no al administrador.');
        return;
      }
      setToken(r.accessToken);
      onOk();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <HeliceFondo className="absolute -right-24 top-0 h-full w-[520px] opacity-60" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Marca subtitulo="Registro de identificación genética" oscuro />
          <div className="max-w-md">
            <p className="eyebrow text-lima-400">Perfil STR · CODIS · QR</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white">
              Del archivo del laboratorio a un expediente verificable.
            </h1>
            <p className="mt-4 text-base leading-7 text-celeste-100/80">
              Importa perfiles genéticos en el formato estándar del FBI, valídalos contra los 20 loci CODIS y
              vincúlalos a la persona con un código QR seguro.
            </p>
          </div>
          <p className="text-xs text-celeste-100/50">Desarrollado por {DESARROLLADOR} · Versión de demostración</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={entrar} className="w-full max-w-sm">
          <div className="lg:hidden">
            <Marca subtitulo="Registro de identificación genética" />
          </div>
          <p className="eyebrow mt-10 lg:mt-0">Administración</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Iniciar sesión</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">Acceso para el personal que registra muestras.</p>
          <label htmlFor="password" className="label mt-8">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={cargando || !password} className="btn-primary mt-6 w-full py-3">
            {cargando ? <Spinner /> : null}
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
          <p className="mt-6 flex items-center gap-2 text-xs text-ink-mute">
            <Icon.shield className="h-4 w-4" /> Datos de prueba. No usar con información real.
          </p>
        </form>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- Pasos

const PASOS = ['Archivo', 'Revisión', 'Persona', 'Código QR'];

function Pasos({ actual }: { actual: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {PASOS.map((nombre, i) => {
        const n = i + 1;
        const hecho = n < actual;
        const activo = n === actual;
        return (
          <li key={nombre} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                hecho
                  ? 'bg-lima-400 text-ink'
                  : activo
                    ? 'bg-celeste-600 text-white ring-4 ring-celeste-100'
                    : 'border border-line bg-white text-ink-mute'
              }`}
            >
              {hecho ? <Icon.check className="h-4 w-4" /> : n}
            </span>
            <span className={`hidden text-sm font-semibold sm:block ${activo ? 'text-ink' : 'text-ink-mute'}`}>
              {nombre}
            </span>
            {n < PASOS.length ? (
              <span className={`h-px flex-1 ${hecho ? 'bg-lima-400' : 'bg-line'}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function PasoArchivo({ onAnalizado }: { onAnalizado: (a: Analisis) => void }) {
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function subir(archivo?: File) {
    if (!archivo) return;
    setError('');
    setCargando(archivo.name);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      onAnalizado(await api<Analisis>('/muestras/analizar', { method: 'POST', body: form }));
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando('');
      if (input.current) input.current.value = '';
    }
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    void subir(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Archivo del laboratorio</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Sube el resultado del análisis genético. El servidor lo valida y lo convierte a un JSON normalizado.
        </p>
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
        disabled={Boolean(cargando)}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
          arrastrando ? 'border-celeste-400 bg-celeste-50' : 'border-line bg-surface hover:border-celeste-200 hover:bg-celeste-50/60'
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-celeste-600 shadow-card">
          {cargando ? <Spinner className="h-6 w-6" /> : <Icon.upload className="h-7 w-7" />}
        </span>
        <span className="mt-4 text-base font-semibold text-ink">
          {cargando ? `Procesando ${cargando}…` : 'Arrastra el archivo aquí o haz clic para elegirlo'}
        </span>
        <span className="mt-2 flex flex-wrap justify-center gap-2">
          {['CODIS CMF · .xml', 'Planilla · .xlsx', 'Tabla · .csv'].map((t) => (
            <span key={t} className="chip bg-white font-mono text-ink-soft ring-1 ring-line">
              {t}
            </span>
          ))}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".xml,.xlsx,.csv,.fsa,.hid"
        className="hidden"
        onChange={(e) => void subir(e.target.files?.[0])}
      />

      {error ? <Aviso tono="error" titulo="No se pudo procesar el archivo">{error}</Aviso> : null}

      <div className="rounded-xl border border-line bg-white px-4 py-3 text-xs leading-5 text-ink-soft">
        <span className="font-semibold text-ink">¿Y el archivo crudo del secuenciador (.fsa)?</span> Contiene las
        curvas del electroferograma. El laboratorio lo analiza y exporta la tabla de alelos en formato CMF, que es
        lo que recibe este sistema.
      </div>
    </div>
  );
}

function PasoRevision({
  analisis,
  indice,
  setIndice,
  onVolver,
  onContinuar,
}: {
  analisis: Analisis;
  indice: number;
  setIndice: (i: number) => void;
  onVolver: () => void;
  onContinuar: () => void;
}) {
  const muestra = analisis.muestras[indice];
  const { archivo } = analisis;
  const yaRegistrada = muestra.coincidencias.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Revisión del perfil</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {analisis.muestras.length > 1
              ? `El archivo trae ${analisis.muestras.length} muestras. Elige la que vas a registrar.`
              : 'Verifica los marcadores antes de asociarlos a una persona.'}
          </p>
        </div>
        <button type="button" onClick={onVolver} className="btn-ghost">
          Cambiar archivo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon.file className="h-5 w-5 text-celeste-600" /> {archivo.nombre}
        </span>
        <span className="chip bg-celeste-100 text-celeste-700">{archivo.formatoNombre}</span>
        <span className="text-xs text-ink-mute">{bytes(archivo.tamanoBytes)}</span>
        <span className="font-mono text-xs text-ink-mute" title={archivo.sha256}>
          SHA-256 {archivo.sha256.slice(0, 12)}…
        </span>
      </div>

      <div className={`grid gap-6 ${analisis.muestras.length > 1 ? 'lg:grid-cols-[240px_1fr]' : ''}`}>
        {analisis.muestras.length > 1 ? (
          <ul className="max-h-[520px] space-y-1.5 overflow-auto pr-1">
            {analisis.muestras.map((m, i) => (
              <li key={m.codigoMuestra + i}>
                <button
                  type="button"
                  onClick={() => setIndice(i)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                    i === indice ? 'border-celeste-400 bg-celeste-50' : 'border-transparent hover:bg-surface'
                  }`}
                >
                  <span>
                    <span className="block font-mono text-sm font-semibold">{m.codigoMuestra}</span>
                    <span className="text-xs text-ink-mute">
                      {m.resumen.codisPresentes}/20 CODIS · {m.resumen.sexo}
                    </span>
                  </span>
                  {m.coincidencias.length ? (
                    <span className="chip bg-amber-100 text-amber-800">Registrada</span>
                  ) : m.resumen.completoCodis ? (
                    <Icon.check className="h-4 w-4 text-lima-600" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-lg font-bold">{muestra.codigoMuestra}</p>
            {muestra.metadatos.SPECIMENCATEGORY ? (
              <span className="text-xs text-ink-mute">Categoría: {muestra.metadatos.SPECIMENCATEGORY}</span>
            ) : null}
          </div>

          {yaRegistrada ? (
            <Aviso tono="alerta" titulo="Este perfil ya existe en el registro">
              Coincide en {muestra.coincidencias[0].lociComparados} loci con{' '}
              <b>{muestra.coincidencias[0].nombreCompleto}</b> ({muestra.coincidencias[0].identificador}). No se puede
              registrar de nuevo.
            </Aviso>
          ) : (
            <Aviso tono="ok" titulo="Sin coincidencias en el registro">
              El perfil se comparó con todas las personas registradas y no coincide con ninguna.
            </Aviso>
          )}
          {muestra.resumen.mezclaSospechosa ? (
            <Aviso tono="alerta" titulo="Posible mezcla de ADN">
              {muestra.resumen.lociConMasDeDosAlelos.join(', ')} tienen más de dos alelos. Conviene revisarlo con el
              laboratorio.
            </Aviso>
          ) : null}
          {!muestra.resumen.completoCodis ? (
            <Aviso tono="alerta" titulo={`Faltan ${muestra.resumen.codisFaltantes.length} loci CODIS`}>
              {muestra.resumen.codisFaltantes.join(', ')}
            </Aviso>
          ) : null}

          <Indicadores resumen={muestra.resumen} />
          <GrillaMarcadores marcadores={muestra.marcadoresSTR} />
          <Leyenda />
          <VisorJson
            titulo="JSON normalizado que procesa el servidor"
            valor={{ codigoMuestra: muestra.codigoMuestra, marcadoresSTR: muestra.marcadoresSTR }}
          />
        </div>
      </div>

      <div className="flex justify-end border-t border-line pt-5">
        <button type="button" onClick={onContinuar} disabled={yaRegistrada} className="btn-primary px-6">
          Asociar a una persona
        </button>
      </div>
    </div>
  );
}

function PasoPersona({
  analisis,
  indice,
  onVolver,
  onRegistrada,
}: {
  analisis: Analisis;
  indice: number;
  onVolver: () => void;
  onRegistrada: (p: { id: string; nombreCompleto: string; identificador: string }) => void;
}) {
  const muestra = analisis.muestras[indice];
  const [datos, setDatos] = useState<DatosPersona>({
    nombreCompleto: '',
    identificador: '',
    fechaNacimiento: '',
    nacionalidad: '',
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const campo = (k: keyof DatosPersona) => ({
    value: datos[k],
    onChange: (e: { target: { value: string } }) => setDatos((d) => ({ ...d, [k]: e.target.value })),
  });

  async function registrar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const r = await api<{ id: string; nombreCompleto: string; identificador: string }>('/personas/importar', {
        method: 'POST',
        body: JSON.stringify({
          nombreCompleto: datos.nombreCompleto,
          identificador: datos.identificador,
          ...(datos.fechaNacimiento ? { fechaNacimiento: datos.fechaNacimiento } : {}),
          ...(datos.nacionalidad ? { nacionalidad: datos.nacionalidad } : {}),
          perfilGenetico: {
            codigoMuestra: muestra.codigoMuestra,
            marcadoresSTR: muestra.marcadoresSTR,
            formatoOrigen: analisis.archivo.formato,
            archivoOrigen: analisis.archivo.nombre,
            hashArchivo: analisis.archivo.sha256,
          },
        }),
      });
      onRegistrada(r);
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={registrar} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Datos de la persona</h2>
          <p className="mt-1 text-sm text-ink-soft">
            El archivo genético no trae identidad: solo el código de muestra. Los datos personales se ingresan aquí
            y se guardan por separado.
          </p>
        </div>
        <button type="button" onClick={onVolver} className="btn-ghost">
          Volver
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="nombre">Nombre completo</label>
            <input id="nombre" className="input" required minLength={3} placeholder="Nombre y apellidos" {...campo('nombreCompleto')} />
          </div>
          <div>
            <label className="label" htmlFor="doc">Documento de identidad</label>
            <input id="doc" className="input font-mono" required placeholder="RUT o pasaporte" {...campo('identificador')} />
          </div>
          <div>
            <label className="label" htmlFor="nac">Nacionalidad</label>
            <input id="nac" className="input" placeholder="Opcional" {...campo('nacionalidad')} />
          </div>
          <div>
            <label className="label" htmlFor="fecha">Fecha de nacimiento</label>
            <input id="fecha" type="date" className="input" {...campo('fechaNacimiento')} />
          </div>
          <div>
            <label className="label">Muestra vinculada</label>
            <div className="input flex items-center gap-2 bg-surface font-mono">
              <Icon.dna className="h-4 w-4 text-celeste-600" /> {muestra.codigoMuestra}
              <span className="ml-auto text-xs text-ink-mute">{muestra.resumen.codisPresentes}/20</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="label">Huella dactilar</p>
          <div className="mt-3 flex flex-col items-center rounded-xl bg-white px-4 py-6 text-center ring-1 ring-line">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-lima-50 text-lima-600">
              <Icon.fingerprint className="h-12 w-12" />
            </span>
            <p className="mt-3 text-sm font-semibold">Huella asociada</p>
            <p className="mt-1 text-xs text-ink-mute">Tomada junto con la muestra de ADN</p>
          </div>
        </div>
      </div>

      {error ? <Aviso tono="error" titulo="No se pudo registrar">{error}</Aviso> : null}

      <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
        <button type="submit" disabled={cargando} className="btn-primary px-6">
          {cargando ? <Spinner /> : null}
          Registrar y generar QR
        </button>
      </div>
    </form>
  );
}

function TarjetaQr({ qr, acciones }: { qr: QrVista; acciones?: ReactNode }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(qr.url);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }
  return (
    <div className="grid items-center gap-8 md:grid-cols-[280px_1fr]">
      <div className="relative mx-auto w-full max-w-[280px] rounded-3xl bg-white p-5 shadow-card ring-1 ring-line">
        <img src={qr.imagen} alt={`Código QR de ${qr.nombreCompleto}`} className="w-full" />
        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-lima-400" /> {PRODUCTO}
        </div>
      </div>
      <div className="space-y-5">
        <div>
          <p className="eyebrow">Expediente listo</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight">{qr.nombreCompleto}</h3>
          <p className="font-mono text-sm text-ink-soft">{qr.identificador}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
          <p className="truncate font-mono text-xs text-ink-soft">{qr.url}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copiar} className="btn-secondary">
            <Icon.copy className="h-4 w-4" /> {copiado ? 'Copiado' : 'Copiar enlace'}
          </button>
          <a href={qr.imagen} download={`qr-${qr.identificador}.png`} className="btn-secondary">
            <Icon.download className="h-4 w-4" /> Descargar PNG
          </a>
          <a href={qr.url} target="_blank" rel="noreferrer" className="btn-secondary">
            <Icon.external className="h-4 w-4" /> Abrir expediente
          </a>
        </div>
        <Aviso tono="info" titulo="El QR no contiene datos genéticos">
          Solo lleva un token aleatorio. El servidor guarda su hash y, si se genera uno nuevo, el anterior deja de
          funcionar.
        </Aviso>
        {acciones}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Registro

function TablaPersonas({
  personas,
  cargando,
  onQr,
  qrCargando,
}: {
  personas: Persona[];
  cargando: boolean;
  onQr: (p: Persona) => void;
  qrCargando: string | null;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <h2 className="text-base font-bold">Personas registradas</h2>
          <p className="text-xs text-ink-mute">{personas.length} en el registro</p>
        </div>
        {cargando ? <Spinner className="h-4 w-4 text-celeste-600" /> : null}
      </div>
      {personas.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-mute">Aún no hay personas registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-[11px] uppercase tracking-wide text-ink-mute">
              <tr>
                <th className="px-6 py-3 font-semibold">Persona</th>
                <th className="px-3 py-3 font-semibold">Muestra</th>
                <th className="px-3 py-3 font-semibold">CODIS</th>
                <th className="px-3 py-3 font-semibold">Origen</th>
                <th className="px-3 py-3 font-semibold">Registro</th>
                <th className="px-6 py-3 text-right font-semibold">QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {personas.map((p) => (
                <tr key={p.id} className="hover:bg-surface/60">
                  <td className="px-6 py-3.5">
                    <p className="font-semibold">{p.nombreCompleto}</p>
                    <p className="font-mono text-xs text-ink-mute">{p.identificador}</p>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-xs">{p.codigoMuestra ?? '—'}</td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`chip font-mono ${p.codisPresentes === 20 ? 'bg-lima-100 text-lima-800' : 'bg-amber-100 text-amber-800'}`}
                    >
                      {p.codisPresentes}/20
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-ink-soft">
                    {p.formatoOrigen ? NOMBRE_FORMATO[p.formatoOrigen] ?? p.formatoOrigen : '—'}
                  </td>
                  <td className="px-3 py-3.5 text-xs text-ink-soft">{fecha(p.createdAt)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onQr(p)}
                      disabled={qrCargando === p.id}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      {qrCargando === p.id ? <Spinner className="h-3.5 w-3.5" /> : <Icon.qr className="h-4 w-4" />}
                      {p.tieneQr ? 'Regenerar' : 'Generar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Modal({ children, onCerrar }: { children: ReactNode; onCerrar: () => void }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div className="card relative w-full max-w-3xl p-8" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onCerrar} className="btn-ghost absolute right-3 top-3 p-2" aria-label="Cerrar">
          <Icon.x className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- App

export default function App() {
  const [autenticado, setAutenticado] = useState(() => Boolean(getToken()));
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [paso, setPaso] = useState(1);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [indice, setIndice] = useState(0);
  const [qrFlujo, setQrFlujo] = useState<QrVista | null>(null);
  const [qrModal, setQrModal] = useState<QrVista | null>(null);
  const [qrCargando, setQrCargando] = useState<string | null>(null);
  const [error, setError] = useState('');

  function salir() {
    clearToken();
    setAutenticado(false);
  }

  async function cargar() {
    setCargandoLista(true);
    try {
      setPersonas(await api<Persona[]>('/personas'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return salir();
      setError(mensaje(err));
    } finally {
      setCargandoLista(false);
    }
  }

  useEffect(() => {
    if (autenticado) void cargar();
  }, [autenticado]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [paso]);

  async function qrDe(p: { id: string; nombreCompleto: string; identificador: string }): Promise<QrVista> {
    const { url } = await api<{ url: string }>(`/personas/${p.id}/qr`, { method: 'POST' });
    return { nombreCompleto: p.nombreCompleto, identificador: p.identificador, url, imagen: await crearQr(url) };
  }

  async function onRegistrada(p: { id: string; nombreCompleto: string; identificador: string }) {
    try {
      setQrFlujo(await qrDe(p));
      setPaso(4);
    } catch (err) {
      setError(mensaje(err));
    }
    void cargar();
  }

  async function onQrTabla(p: Persona) {
    setQrCargando(p.id);
    try {
      setQrModal(await qrDe(p));
      void cargar();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setQrCargando(null);
    }
  }

  function reiniciar() {
    setPaso(1);
    setAnalisis(null);
    setIndice(0);
    setQrFlujo(null);
  }

  if (!autenticado) return <Login onOk={() => setAutenticado(true)} />;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Marca />
            <span className="hidden h-6 w-px bg-line sm:block" />
            <span className="hidden text-sm font-medium text-ink-soft sm:block">Administración</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip hidden bg-lima-100 text-lima-800 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-lima-600" /> Demo · datos de prueba
            </span>
            <button type="button" onClick={salir} className="btn-ghost px-3">
              <Icon.logout className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <div>
          <p className="eyebrow">Nuevo registro</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Registro de identificación genética</h1>
        </div>

        {error ? (
          <Aviso tono="error" titulo="Error">
            {error}{' '}
            <button type="button" className="underline" onClick={() => setError('')}>
              Cerrar
            </button>
          </Aviso>
        ) : null}

        <section className="card p-6 sm:p-8">
          <Pasos actual={paso} />
          <div className="mt-8">
            {paso === 1 ? (
              <PasoArchivo
                onAnalizado={(a) => {
                  setAnalisis(a);
                  setIndice(Math.max(0, a.muestras.findIndex((m) => m.coincidencias.length === 0)));
                  setPaso(2);
                }}
              />
            ) : null}
            {paso === 2 && analisis ? (
              <PasoRevision
                analisis={analisis}
                indice={indice}
                setIndice={setIndice}
                onVolver={reiniciar}
                onContinuar={() => setPaso(3)}
              />
            ) : null}
            {paso === 3 && analisis ? (
              <PasoPersona analisis={analisis} indice={indice} onVolver={() => setPaso(2)} onRegistrada={onRegistrada} />
            ) : null}
            {paso === 4 && qrFlujo ? (
              <TarjetaQr
                qr={qrFlujo}
                acciones={
                  <button type="button" onClick={reiniciar} className="btn-primary">
                    Registrar otra muestra
                  </button>
                }
              />
            ) : null}
          </div>
        </section>

        <TablaPersonas personas={personas} cargando={cargandoLista} onQr={onQrTabla} qrCargando={qrCargando} />

        <footer className="flex flex-wrap items-center justify-between gap-3 pb-6 text-xs text-ink-mute">
          <span>
            {PRODUCTO} · Prototipo de demostración con datos de prueba. Desarrollado por {DESARROLLADOR}.
          </span>
          <span>Estándar de importación: CODIS CMF (FBI)</span>
        </footer>
      </main>

      {qrModal ? (
        <Modal onCerrar={() => setQrModal(null)}>
          <TarjetaQr qr={qrModal} />
        </Modal>
      ) : null}
    </div>
  );
}
