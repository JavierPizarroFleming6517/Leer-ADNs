import { useState } from 'react';
import { post } from '../api';
import { LineaTiempo } from '../componentes/LineaTiempo';
import { Icon, Spinner, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

type Resultado = { integra: boolean; eventos: number; ultimoHash: string | null; errores: { secuencia: number; tipo: string; motivo: string }[] };

export default function CustodiaTab({ f }: TabProps) {
  const [r, setR] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc');
  const eventos = orden === 'asc' ? f.custodia.eventos : [...f.custodia.eventos].reverse();
  async function verificar() {
    setCargando(true);
    setError('');
    try {
      setR(await post<Resultado>(`/stickers/${f.sticker.codigo}/custodia/verificar`));
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setCargando(false);
    }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Seccion
        titulo={`Línea de tiempo · ${f.custodia.total} eventos`}
        icono={Icon.chain}
        acciones={
          <button type="button" className="btn-ghost btn-sm" onClick={() => setOrden(orden === 'asc' ? 'desc' : 'asc')}>
            {orden === 'asc' ? 'Más antiguo primero' : 'Más reciente primero'}
          </button>
        }
      >
        <LineaTiempo eventos={eventos} errores={r?.errores.map((e) => e.secuencia)} />
      </Seccion>
      <div className="space-y-5">
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Icon.shield className="h-5 w-5 text-celeste-600" /> Integridad de la cadena
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Cada evento incluye el SHA-256 del anterior del mismo sticker, como un blockchain simple. Un trigger de PostgreSQL impide editar o borrar eventos, incluso desde la base.
          </p>
          <button type="button" className="btn-primary mt-4 w-full" onClick={() => void verificar()} disabled={cargando} data-testid="verificar-cadena">
            {cargando ? <Spinner /> : <Icon.chain className="h-4 w-4" />} Verificar cadena
          </button>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {r ? (
            <div className={`aparecer mt-4 rounded-xl border-2 p-4 ${r.integra ? 'border-lima-400 bg-lima-50' : 'border-red-300 bg-red-50'}`} data-testid={r.integra ? 'cadena-ok' : 'cadena-falla'}>
              <p className={`flex items-center gap-2 text-base font-bold ${r.integra ? 'text-lima-800' : 'text-red-800'}`}>
                {r.integra ? <Icon.check className="h-5 w-5" /> : <Icon.x className="h-5 w-5" />}
                {r.integra ? `✓ Cadena íntegra · ${r.eventos} eventos` : '✗ Cadena alterada'}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Se recalculó el hash de cada evento y su enlace con el anterior.</p>
              {r.errores.map((e, i) => (
                <p key={i} className="mt-2 text-xs text-red-800">
                  #{e.secuencia} {e.tipo}: {e.motivo}
                </p>
              ))}
            </div>
          ) : null}
        </section>
        <section className="card p-5 text-xs leading-5 text-ink-soft">
          <p className="font-semibold text-ink">Cómo se calcula</p>
          <p className="mt-1 font-mono text-[11px]">hashEvento = SHA-256(JSON canónico de {'{'}sticker, secuencia, tipo, fecha, responsable, detalle, SHA-256 del archivo, hashAnterior{'}'})</p>
          <p className="mt-2">El primer evento (fabricación) parte de un hash anterior de 64 ceros.</p>
        </section>
      </div>
    </div>
  );
}
