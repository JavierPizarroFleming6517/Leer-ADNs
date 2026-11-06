import { type FormEvent, useState } from 'react';
import { post } from '../api';
import { useSesion } from '../sesion';
import { DEDOS } from '../tipos';
import { Aviso, Dato, Icon, Spinner, Vacio, fecha, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

function ahoraLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function TomaTab({ f, recargar }: TabProps) {
  const { puede, usuario } = useSesion();
  const edita = puede('ADMIN', 'OPERADOR_TOMA') && !f.sticker.anulado;
  return (
    <div className="max-w-4xl">
      {f.toma ? (
        <Seccion titulo="Toma de muestra" icono={Icon.clock} acciones={<span className="chip bg-lima-100 text-lima-800"><Icon.check className="h-3.5 w-3.5" /> Registrada</span>}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="Fecha y hora" valor={fecha(f.toma.fechaHora)} />
            <Dato etiqueta="Lugar" valor={f.toma.lugar} />
            <Dato etiqueta="Operador" valor={f.toma.operador} />
            <Dato etiqueta="Plantilla" valor={f.sticker.plantilla.nombre} />
          </dl>
          {f.toma.observaciones ? <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink-soft">{f.toma.observaciones}</p> : null}
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-mute">Dedos no obtenibles</p>
          {f.toma.dedosNoObtenibles.length ? (
            <ul className="mt-2 space-y-2">
              {f.toma.dedosNoObtenibles.map((d) => (
                <li key={d.posicion} className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface font-mono text-xs font-bold">{d.posicion}</span>
                  <span>
                    <span className="font-semibold">{d.dedo}</span>
                    <span className="block text-ink-soft">{d.motivo}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">Ninguno: se tomaron todos los dedos de la plantilla.</p>
          )}
        </Seccion>
      ) : edita && f.persona ? (
        <FormToma f={f} recargar={recargar} operador={usuario?.nombre ?? ''} />
      ) : (
        <Seccion titulo="Toma de muestra" icono={Icon.clock}>
          <Vacio icono={Icon.clock} titulo="Toma pendiente">{f.persona ? 'El operador de toma registra lugar, fecha y dedos no obtenibles.' : 'Primero se asocia una persona al sticker.'}</Vacio>
        </Seccion>
      )}
    </div>
  );
}

function FormToma({ f, recargar, operador }: TabProps & { operador: string }) {
  const [d, setD] = useState({ fechaHora: ahoraLocal(), lugar: 'Centro de Toma TrazaGen · Providencia, Santiago', observaciones: '' });
  const [noObt, setNoObt] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const tomadas = new Set(f.huellas.map((h) => h.posicion));
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await post(`/stickers/${f.sticker.codigo}/toma`, {
        fechaHora: new Date(d.fechaHora).toISOString(),
        lugar: d.lugar,
        ...(d.observaciones ? { observaciones: d.observaciones } : {}),
        dedosNoObtenibles: Object.entries(noObt).map(([p, motivo]) => ({ posicion: Number(p), motivo })),
      });
      recargar();
    } catch (err) {
      setError(mensaje(err));
    } finally {
      setCargando(false);
    }
  }
  return (
    <Seccion titulo="Registrar toma de muestra" icono={Icon.clock}>
      <form onSubmit={enviar} className="space-y-4" data-testid="form-toma">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <div>
            <label className="label">Fecha y hora</label>
            <input type="datetime-local" className="input" value={d.fechaHora} onChange={(e) => setD({ ...d, fechaHora: e.target.value })} required />
          </div>
          <div>
            <label className="label">Lugar</label>
            <input className="input" value={d.lugar} onChange={(e) => setD({ ...d, lugar: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="label">Operador</label>
          <input className="input" value={operador} disabled />
        </div>
        <div>
          <label className="label">Observaciones</label>
          <textarea className="input min-h-[72px]" value={d.observaciones} onChange={(e) => setD({ ...d, observaciones: e.target.value })} placeholder="Condiciones de la toma, uso de grafito, etc." />
        </div>
        <div>
          <label className="label">Dedos no obtenibles</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {f.sticker.plantilla.posiciones.map((p) => {
              const marcado = p in noObt;
              return (
                <div key={p} className={`rounded-xl border px-3 py-2 ${marcado ? 'border-amber-300 bg-amber-50' : 'border-line'}`}>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={tomadas.has(p)}
                      onChange={(e) => {
                        const n = { ...noObt };
                        if (e.target.checked) n[p] = '';
                        else delete n[p];
                        setNoObt(n);
                      }}
                    />
                    <span className="font-mono text-xs text-ink-mute">{p}</span> {DEDOS[p]}
                  </label>
                  {marcado ? <input className="input mt-2 py-1.5" placeholder="Motivo (amputación, lesión…)" value={noObt[p]} onChange={(e) => setNoObt({ ...noObt, [p]: e.target.value })} required minLength={3} /> : null}
                </div>
              );
            })}
          </div>
        </div>
        {error ? <Aviso tono="error" titulo={error} /> : null}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={cargando} data-testid="guardar-toma">
            {cargando ? <Spinner /> : <Icon.check className="h-4 w-4" />} Registrar toma
          </button>
        </div>
      </form>
    </Seccion>
  );
}
