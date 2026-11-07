import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function useQr(texto: string | null | undefined, ancho = 480) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    if (!texto) return;
    QRCode.toDataURL(texto, { errorCorrectionLevel: 'M', margin: 1, width: ancho, color: { dark: '#0B2F45', light: '#FFFFFF' } })
      .then(setImg)
      .catch(() => setImg(null));
  }, [texto, ancho]);
  return img;
}

export function QrImagen({ texto, className = 'h-40 w-40' }: { texto: string; className?: string }) {
  const img = useQr(texto);
  return img ? <img src={img} alt="Código QR" className={className} /> : <div className={`${className} animate-pulse rounded-lg bg-surface`} />;
}
