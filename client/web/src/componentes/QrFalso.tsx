import { Link } from 'react-router-dom';
import { Icon } from '../ui';

// Pantalla roja cuando el código no fue emitido por TrazaGen (firma inválida o código inexistente).
export function QrFalso({ motivo, codigo, onReintentar }: { motivo: string; codigo?: string | null; onReintentar?: () => void }) {
  return (
    <div className="aparecer overflow-hidden rounded-3xl bg-red-600 text-white shadow-2xl" data-testid="qr-falso">
      <div className="flex flex-col items-center px-6 py-12 text-center sm:py-16">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/10">
          <Icon.shieldX className="h-11 w-11" />
        </span>
        <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Código no emitido por TrazaGen</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-red-50">{motivo}</p>
        {codigo ? <p className="mt-3 rounded-lg bg-black/15 px-3 py-1.5 font-mono text-sm">{codigo}</p> : null}
        <p className="mt-6 max-w-md text-xs leading-5 text-red-100/90">
          No uses este sticker. El intento quedó registrado en la auditoría con fecha, usuario e IP.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onReintentar ? (
            <button type="button" onClick={onReintentar} className="btn bg-white text-red-700 hover:bg-red-50">
              <Icon.scan className="h-4 w-4" /> Verificar otro código
            </button>
          ) : (
            <Link to="/verificacion?modo=qr" className="btn bg-white text-red-700 hover:bg-red-50">
              <Icon.scan className="h-4 w-4" /> Verificar otro código
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
