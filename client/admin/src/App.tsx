import { FormEvent, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ApiError, api, clearToken, getToken, setToken } from './api';
import type { ImportPayload, Persona } from './types';

type QrView = {
  personaId: string;
  nombreCompleto: string;
  identificador: string;
  url: string;
  image: string;
};

function readPersonaFile(file: File): Promise<ImportPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result).replace(/^\uFEFF/, '');
        resolve(parsePersona(JSON.parse(text)));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('El archivo no contiene JSON válido.'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file, 'utf-8');
  });
}

function parsePersona(data: unknown): ImportPayload {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('El archivo debe contener un objeto JSON con los datos de una persona.');
  }

  const record = data as Record<string, unknown>;
  if (typeof record.nombreCompleto !== 'string' || !record.nombreCompleto.trim()) {
    throw new Error('Falta nombreCompleto.');
  }
  if (typeof record.identificador !== 'string' || !record.identificador.trim()) {
    throw new Error('Falta identificador.');
  }

  const perfil = record.perfilGenetico;
  if (!perfil || typeof perfil !== 'object' || Array.isArray(perfil)) {
    throw new Error('Falta el perfilGenetico.');
  }

  const marcadores = (perfil as { marcadoresSTR?: unknown }).marcadoresSTR;
  if (!marcadores || typeof marcadores !== 'object' || Array.isArray(marcadores)) {
    throw new Error('Faltan los marcadoresSTR.');
  }

  return data as ImportPayload;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [qrLoadingId, setQrLoadingId] = useState<string | null>(null);
  const [qrError, setQrError] = useState('');
  const [qrView, setQrView] = useState<QrView | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadPersonas() {
    setListLoading(true);
    setListError('');
    try {
      setPersonas(await api<Persona[]>('/personas'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
        setAuthed(false);
        return;
      }
      setListError(messageOf(error));
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (authed) {
      void loadPersonas();
    }
  }, [authed]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await api<{ accessToken: string; role: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (result.role !== 'ADMIN') {
        setLoginError('Esta contraseña corresponde al lector, no al administrador.');
        return;
      }
      setToken(result.accessToken);
      setPassword('');
      setAuthed(true);
    } catch (error) {
      setLoginError(messageOf(error));
    } finally {
      setLoginLoading(false);
    }
  }

  async function onFile(file: File | undefined) {
    setImportError('');
    setImportMessage('');
    setFileError('');
    setPayload(null);
    setFileName(file?.name ?? '');
    if (!file) {
      return;
    }
    try {
      setPayload(await readPersonaFile(file));
    } catch (error) {
      setFileError(messageOf(error));
    }
  }

  async function onImport() {
    if (!payload) {
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportMessage('');
    try {
      const created = await api<Persona>('/personas/importar', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setImportMessage(`Persona registrada: ${created.nombreCompleto} (${created.identificador}).`);
      setPayload(null);
      setFileName('');
      if (fileRef.current) {
        fileRef.current.value = '';
      }
      await loadPersonas();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
        setAuthed(false);
        return;
      }
      setImportError(messageOf(error));
    } finally {
      setImportLoading(false);
    }
  }

  async function onGenerateQr(persona: Persona) {
    setQrLoadingId(persona.id);
    setQrError('');
    setCopied(false);
    try {
      const result = await api<{ url: string }>(`/personas/${persona.id}/qr`, { method: 'POST' });
      const image = await QRCode.toDataURL(result.url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrView({
        personaId: persona.id,
        nombreCompleto: persona.nombreCompleto,
        identificador: persona.identificador,
        url: result.url,
        image,
      });
      setPersonas((current) =>
        current.map((item) => (item.id === persona.id ? { ...item, tieneQr: true } : item)),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearToken();
        setAuthed(false);
        return;
      }
      setQrError(messageOf(error));
    } finally {
      setQrLoadingId(null);
    }
  }

  function downloadQr() {
    if (!qrView) {
      return;
    }
    const link = document.createElement('a');
    link.href = qrView.image;
    link.download = `qr-${qrView.identificador}.png`;
    link.click();
  }

  async function copyUrl() {
    if (!qrView) {
      return;
    }
    try {
      await navigator.clipboard.writeText(qrView.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function logout() {
    clearToken();
    setAuthed(false);
    setPersonas([]);
    setQrView(null);
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form onSubmit={onLogin} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800">Demostración</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Administración</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ingresa la contraseña de administrador para registrar personas y generar códigos QR.
          </p>
          <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-teal-700 focus:ring-2"
          />
          {loginError ? <p className="mt-3 text-sm text-red-700">{loginError}</p> : null}
          <button
            type="submit"
            disabled={loginLoading || !password}
            className="mt-6 w-full rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </main>
    );
  }

  const markerCount = payload ? Object.keys(payload.perfilGenetico.marcadoresSTR).length : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">Demostración</p>
            <h1 className="text-xl font-semibold">Identificación genética</h1>
            <p className="text-sm text-slate-300">Registro de personas y códigos QR</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Registrar persona</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Sube un archivo JSON con los datos personales, las alertas clínicas y el perfil STR. Puedes usar{' '}
              <span className="font-medium text-slate-800">examples/persona-demo.json</span>.
            </p>
            <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="archivo">
              Archivo JSON
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                id="archivo"
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={(event) => void onFile(event.target.files?.[0])}
                className="sr-only"
              />
              <label
                htmlFor="archivo"
                className="cursor-pointer rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200"
              >
                Seleccionar archivo
              </label>
              <span className="text-sm text-slate-500">{fileName || 'Ningún archivo seleccionado'}</span>
            </div>
            {payload ? (
              <p className="mt-2 text-sm text-slate-800">
                {payload.nombreCompleto} · {payload.identificador} · {markerCount}{' '}
                {markerCount === 1 ? 'marcador' : 'marcadores'}
              </p>
            ) : null}
            {fileError ? <p className="mt-3 text-sm text-red-700">{fileError}</p> : null}
            {importError ? <p className="mt-3 text-sm text-red-700">{importError}</p> : null}
            {importMessage ? <p className="mt-3 text-sm text-teal-800">{importMessage}</p> : null}
            <button
              type="button"
              onClick={() => void onImport()}
              disabled={!payload || importLoading}
              className="mt-5 rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importLoading ? 'Registrando...' : 'Registrar'}
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Personas registradas</h2>
              {listLoading ? <span className="text-sm text-slate-500">Actualizando...</span> : null}
            </div>
            {listError ? <p className="px-6 py-4 text-sm text-red-700">{listError}</p> : null}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Nombre</th>
                    <th className="px-6 py-3 font-medium">Identificador</th>
                    <th className="px-6 py-3 font-medium">QR</th>
                    <th className="px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {personas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-slate-500">
                        No hay personas registradas.
                      </td>
                    </tr>
                  ) : (
                    personas.map((persona) => (
                      <tr key={persona.id} className="border-t border-slate-100">
                        <td className="px-6 py-3">{persona.nombreCompleto}</td>
                        <td className="px-6 py-3 font-mono text-xs">{persona.identificador}</td>
                        <td className="px-6 py-3">{persona.tieneQr ? 'Vigente' : 'Sin QR'}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void onGenerateQr(persona)}
                            disabled={qrLoadingId === persona.id}
                            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {qrLoadingId === persona.id ? 'Generando...' : 'Generar QR'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">Código QR</h2>
          {qrError ? <p className="mt-3 text-sm text-red-700">{qrError}</p> : null}
          {qrView ? (
            <div className="mt-4">
              <p className="font-medium">{qrView.nombreCompleto}</p>
              <p className="font-mono text-xs text-slate-500">{qrView.identificador}</p>
              <img
                src={qrView.image}
                alt={`Código QR de ${qrView.nombreCompleto}`}
                className="mt-4 w-full rounded-md border border-slate-200 bg-white"
              />
              <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="qr-url">
                URL del expediente
              </label>
              <input
                id="qr-url"
                readOnly
                value={qrView.url}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={downloadQr}
                  className="rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900"
                >
                  Descargar PNG
                </button>
                <button
                  type="button"
                  onClick={() => void copyUrl()}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  {copied ? 'Copiada' : 'Copiar URL'}
                </button>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Si generas otro QR para esta persona, el anterior deja de funcionar. Para escanearlo desde un teléfono,
                la URL debe usar la IP de esta computadora.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Genera un QR desde el listado para verlo y descargarlo aquí.
            </p>
          )}
        </aside>
      </main>
    </div>
  );
}
