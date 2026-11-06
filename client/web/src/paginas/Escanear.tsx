import { type FormEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../api';
import { Escaner, leerQrDeImagen } from '../componentes/Escaner';
import { QrFalso } from '../componentes/QrFalso';
import { Subir } from '../componentes/Subir';
import { Aviso, Encabezado, Icon, Spinner, mensaje } from '../ui';

export type ResultadoQr =
  | { valido: true; codigo: string; estado: string; vinculado: boolean; firmaVerificada: boolean }
  | { valido: false; motivo: string; codigo: string | null };

export default function Escanear() {
  const nav = useNavigate();
  const [camara, setCamara] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [falso, setFalso] = useState<{ motivo: string; codigo: string | null } | null>(null);

  const resolver = useCallback(
    async (texto: string) => {
      setProcesando(true);
      setError('');
      try {
        const r = await post<ResultadoQr>('/qr/resolver', { texto });
        if (!r.valido) {
          setCamara(false);
          setFalso({ motivo: r.motivo, codigo: r.codigo });
          return;
        }
        nav(`/stickers/${r.codigo}`, { state: { desdeQr: true, firmaVerificada: r.firmaVerificada } });
      } catch (e) {
        setError(mensaje(e));
      } finally {
        setProcesando(false);
      }
    },
    [nav],
  );

  const lectura = useCallback((t: string) => void resolver(t), [resolver]);

  if (falso) return <QrFalso motivo={falso.motivo} codigo={falso.codigo} onReintentar={() => setFalso(null)} />;

  function manual(e: FormEvent) {
    e.preventDefault();
    if (codigo.trim()) void resolver(codigo);
  }

  return (
    <div>
      <Encabezado eyebrow="Escanear" titulo="Leer el QR de un sticker">
        El QR contiene solo el código del sticker y una firma digital Ed25519. Se verifica la firma antes de abrir el expediente: un QR falsificado se rechaza.
      </Encabezado>
      {error ? <Aviso tono="error" titulo="No se pudo leer el código" className="mb-5">{error}</Aviso> : null}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Icon.camera className="h-5 w-5 text-celeste-600" /> Cámara
            </h2>
            <button type="button" onClick={() => setCamara((v) => !v)} className={camara ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}>
              {camara ? 'Detener' : 'Activar cámara'}
            </button>
          </div>
          {camara ? (
            <Escaner activo={camara} onLectura={lectura} />
          ) : (
            <button type="button" onClick={() => setCamara(true)} className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-2xl bg-ink text-celeste-100 transition hover:bg-ink/95">
              <Icon.qr className="h-14 w-14 text-celeste-400" />
              <span className="mt-4 text-sm font-semibold">Apunta la cámara al QR del sticker</span>
              <span className="mt-1 text-xs text-celeste-100/60">Funciona en el celular y en el computador</span>
            </button>
          )}
        </section>
        <div className="space-y-5">
          <form onSubmit={manual} className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Icon.pen className="h-5 w-5 text-celeste-600" /> Código manual
            </h2>
            <p className="mt-1 text-sm text-ink-soft">El código impreso bajo el QR, por ejemplo TG-7K2M-9QXA.</p>
            <div className="mt-4 flex gap-2">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={`input font-mono tracking-wider ${codigo.includes('/') ? '' : 'uppercase'}`}
                placeholder="TG-XXXX-XXXX"
                maxLength={200}
                data-testid="codigo-manual"
              />
              <button type="submit" className="btn-primary" disabled={procesando || codigo.trim().length < 4}>
                {procesando ? <Spinner /> : <Icon.arrowRight className="h-4 w-4" />}
                Abrir
              </button>
            </div>
          </form>
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Icon.image className="h-5 w-5 text-celeste-600" /> Foto del QR
            </h2>
            <Subir
              compacto
              acepta="image/*"
              titulo="Sube o arrastra una foto del QR"
              cargando={procesando ? 'Leyendo…' : false}
              onArchivo={async (f) => {
                setError('');
                try {
                  await resolver(await leerQrDeImagen(f));
                } catch (e) {
                  setError(mensaje(e));
                }
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
