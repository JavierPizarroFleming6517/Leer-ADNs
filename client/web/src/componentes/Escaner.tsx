import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';

// Lector de QR con la cámara del navegador (ZXing). Requiere HTTPS o localhost para acceder a la cámara.
export function Escaner({ onLectura, activo }: { onLectura: (texto: string) => void; activo: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const leido = useRef(false);

  useEffect(() => {
    if (!activo) return;
    leido.current = false;
    let controles: IScannerControls | null = null;
    let vivo = true;
    const lector = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara aquí (se requiere HTTPS o localhost). Usa el código manual o sube una foto del QR.');
      return;
    }
    lector
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (r) => {
        if (r && !leido.current) {
          leido.current = true;
          onLectura(r.getText());
        }
      })
      .then((c) => {
        controles = c;
        if (!vivo) c.stop();
        else setListo(true);
      })
      .catch(() => setError('No se pudo acceder a la cámara. Revisa los permisos o usa el código manual.'));
    return () => {
      vivo = false;
      controles?.stop();
    };
  }, [activo, onLectura]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink">
      <video ref={video} className="h-full w-full object-cover" muted playsInline />
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-celeste-100">
          <Icon.camera className="h-8 w-8 text-celeste-200/60" />
          {error}
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-[62%] w-[62%] max-w-[300px] overflow-hidden rounded-3xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(11,47,69,0.45)]">
            <div className="barrido absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-lima-400/25 to-transparent" />
          </div>
          {!listo ? <p className="absolute bottom-4 text-xs text-celeste-100/80">Iniciando cámara…</p> : null}
        </div>
      )}
    </div>
  );
}

export async function leerQrDeImagen(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const r = await new BrowserQRCodeReader().decodeFromImageUrl(url);
    return r.getText();
  } catch {
    throw new Error('No se encontró un código QR legible en la imagen.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
