import { type FormEvent, useState } from 'react';
import { api, post } from '../api';
import { Aviso, Icon, Modal, Spinner, mensaje } from '../ui';

// Un sticker sin uso (nuevo, sin persona) se puede eliminar. Uno con datos solo se anula:
// queda en el registro, con su custodia, en modo de solo lectura.
export function AccionesSticker({
  codigo,
  sinUso,
  anulado,
  onListo,
  compacto = false,
}: {
  codigo: string;
  sinUso: boolean;
  anulado: boolean;
  onListo: (eliminado: boolean) => void;
  compacto?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  if (anulado) return null;

  async function confirmar(e?: FormEvent) {
    e?.preventDefault();
    setCargando(true);
    setError('');
    try {
      if (sinUso) await api(`/stickers/${codigo}`, { method: 'DELETE' });
      else await post(`/stickers/${codigo}/anular`, { motivo });
      setAbierto(false);
      onListo(sinUso);
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`btn-secondary ${compacto ? 'btn-sm' : ''} text-red-700 hover:border-red-200 hover:bg-red-50`}
        onClick={(e) => {
          e.stopPropagation();
          setError('');
          setMotivo('');
          setAbierto(true);
        }}
        data-testid={sinUso ? 'eliminar-sticker' : 'anular-sticker'}
      >
        {sinUso ? 'Eliminar' : 'Anular'}
      </button>
      <Modal abierto={abierto} onCerrar={() => !cargando && setAbierto(false)} titulo={`${sinUso ? 'Eliminar' : 'Anular'} ${codigo}`}>
        <form onSubmit={confirmar} onClick={(e) => e.stopPropagation()}>
          {sinUso ? (
            <p className="text-sm text-ink-soft">
              Este sticker nunca se usó: no tiene persona, toma ni resultados. Se elimina junto con su evento de fabricación.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-soft">
                Este sticker tiene datos, así que <b>no se borra</b>: queda anulado. Se conserva con toda su cadena de custodia, su vínculo se revoca, ya no admite cambios y deja de participar en las búsquedas.
              </p>
              <label className="label mt-4">Motivo</label>
              <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: sticker dañado en el envío; se repite la toma" minLength={5} required data-testid="motivo-anulacion" />
            </>
          )}
          {error ? <Aviso tono="error" titulo={error} className="mt-4" /> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={cargando} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn bg-red-600 text-white hover:bg-red-700" disabled={cargando || (!sinUso && motivo.trim().length < 5)} data-testid="confirmar-accion">
              {cargando ? <Spinner /> : <Icon.x className="h-4 w-4" />} {sinUso ? 'Eliminar sticker' : 'Anular sticker'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
