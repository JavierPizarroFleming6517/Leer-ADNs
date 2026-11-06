import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { post } from '../api';
import { QrFalso } from '../componentes/QrFalso';
import { Aviso, Cargando, mensaje } from '../ui';
import type { ResultadoQr } from './Escanear';

// Destino de la URL del QR: /s/{codigo}.{firma}. Verifica la firma en el servidor antes de mostrar nada.
export default function QrResolver() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const [falso, setFalso] = useState<{ motivo: string; codigo: string | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    post<ResultadoQr>('/qr/resolver', { texto: `/s/${token}` })
      .then((r) => {
        if (r.valido) nav(`/stickers/${r.codigo}`, { replace: true, state: { desdeQr: true, firmaVerificada: r.firmaVerificada } });
        else setFalso({ motivo: r.motivo, codigo: r.codigo });
      })
      .catch((e) => setError(mensaje(e)));
  }, [token, nav]);

  if (falso) return <QrFalso motivo={falso.motivo} codigo={falso.codigo} />;
  if (error) return <Aviso tono="error" titulo="No se pudo verificar el código">{error}</Aviso>;
  return <Cargando texto="Verificando la firma del código…" />;
}
