import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, descargar } from '../api';
import { useQr } from '../componentes/QrImagen';
import { useCarga, useSesion } from '../sesion';
import { Aviso, Cargando, Icon, Logo, fecha } from '../ui';

type LoteDetalle = {
  id: string;
  codigo: string;
  cantidad: number;
  versionDiseno: string;
  fabrica: string;
  fechaFabricacion: string;
  plantilla: { nombre: string };
  stickers: { id: string; codigo: string; estado: string; url: string }[];
};

function Etiqueta({ codigo, url, lote }: { codigo: string; url: string; lote: string }) {
  const img = useQr(url, 360);
  return (
    <div className="flex break-inside-avoid items-center gap-3 rounded-xl border border-line bg-white p-3 print:rounded-none print:border-dashed" data-testid="etiqueta" data-url={url}>
      {img ? <img src={img} alt={`QR ${codigo}`} className="h-[30mm] w-[30mm] shrink-0" /> : <div className="h-[30mm] w-[30mm] shrink-0 bg-surface" />}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Logo className="h-5 w-5" />
          <span className="text-[11px] font-bold tracking-tight">TrazaGen</span>
        </div>
        <p className="mt-2 font-mono text-[13px] font-bold tracking-wide">{codigo}</p>
        <p className="mt-1 text-[9px] leading-tight text-ink-mute">
          Lote {lote}
          <br />
          ID dactilogenético
        </p>
      </div>
    </div>
  );
}

// Página imprimible: grilla de etiquetas QR, lista para imprimir o guardar como PDF.
export default function Etiquetas() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { puede } = useSesion();
  const { datos, error } = useCarga(() => api<LoteDetalle>(`/lotes/${id}`), [id]);
  if (error) return <Aviso tono="error" titulo="No se pudo cargar el lote">{error}</Aviso>;
  if (!datos) return <Cargando />;
  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <div className="no-imprimir sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-3">
          <Link to="/stickers?vista=lotes" className="btn-ghost btn-sm">
            <Icon.arrowLeft className="h-4 w-4" /> Volver
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-mono font-bold">{datos.codigo}</p>
            <p className="text-xs text-ink-mute">
              {datos.cantidad} etiquetas · {datos.plantilla.nombre} · fabricado {fecha(datos.fechaFabricacion, false)}
            </p>
          </div>
          {puede('ADMIN') ? (
            <button type="button" className="btn-secondary btn-sm" onClick={() => void descargar(`/lotes/${datos.id}/csv`, `${datos.codigo}.csv`)} data-testid="descargar-csv">
              <Icon.download className="h-4 w-4" /> CSV para la fábrica
            </button>
          ) : null}
          <button type="button" className="btn-primary btn-sm" onClick={() => window.print()}>
            <Icon.printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-5 py-6 print:max-w-none print:p-0">
        {params.get('nuevo') ? (
          <Aviso tono="ok" titulo={`Lote ${datos.codigo} creado`} className="no-imprimir mb-5">
            Se generaron {datos.cantidad} stickers con su QR firmado y su evento de fabricación en la cadena de custodia.
          </Aviso>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-0">
          {datos.stickers.map((s) => (
            <Etiqueta key={s.id} codigo={s.codigo} url={s.url} lote={datos.codigo} />
          ))}
        </div>
      </div>
    </div>
  );
}
