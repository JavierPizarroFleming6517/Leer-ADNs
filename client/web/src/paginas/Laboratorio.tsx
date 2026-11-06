import { Link } from 'react-router-dom';
import { api } from '../api';
import { useCarga } from '../sesion';
import { ETAPAS_LAB, NOMBRE_ETAPA } from '../tipos';
import { Cargando, ChipEstado, Encabezado, Icon, Vacio } from '../ui';

type Muestra = { codigo: string; sticker: string; estado: string; laboratorio: string; estadoSello: string; etapa: string; etapaNombre: string; diasEnEtapa: number; diasEnLab: number; kit: string | null; tienePerfil: boolean; materialRestante: boolean };

export default function Laboratorio() {
  const { datos, cargando } = useCarga(() => api<Muestra[]>('/laboratorio/bandeja'));
  if (cargando && !datos) return <Cargando />;
  const enProceso = (datos ?? []).filter((m) => m.etapa !== 'PERFIL_CARGADO');
  const listas = (datos ?? []).filter((m) => m.etapa === 'PERFIL_CARGADO');
  return (
    <div>
      <Encabezado eyebrow="Laboratorio" titulo="Bandeja de muestras">
        Cada etapa se registra como un evento de la cadena de custodia, con el hash del archivo asociado. Abre una muestra para registrar la siguiente etapa.
      </Encabezado>
      {enProceso.length ? (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 2xl:grid 2xl:grid-cols-6 xl:grid xl:grid-cols-6">
          {ETAPAS_LAB.slice(0, -1).map((e) => {
            const items = enProceso.filter((m) => m.etapa === e);
            return (
              <div key={e} className="w-[240px] shrink-0 xl:w-auto">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{NOMBRE_ETAPA[e]}</p>
                  <span className="chip bg-white font-mono text-ink-soft ring-1 ring-line">{items.length}</span>
                </div>
                <div className="min-h-[120px] space-y-2 rounded-2xl bg-white/60 p-2 ring-1 ring-line">
                  {items.map((m) => (
                    <Link key={m.codigo} to={`/stickers/${m.sticker}/laboratorio`} className="block rounded-xl border border-line bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-celeste-200 hover:shadow-md" data-testid="muestra-bandeja">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm font-bold">{m.codigo}</p>
                        <ChipEstado estado={m.estado} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-ink-mute">{m.sticker}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={`chip ${m.diasEnEtapa > 3 ? 'bg-amber-100 text-amber-800' : 'bg-surface text-ink-soft'}`}>
                          <Icon.clock className="h-3 w-3" /> {m.diasEnEtapa} d en etapa
                        </span>
                        {m.estadoSello !== 'INTACTO' ? <span className="chip bg-red-100 text-red-700">Sello {m.estadoSello === 'DANADO' ? 'dañado' : 'ausente'}</span> : null}
                        {m.kit ? <span className="chip bg-violet-100 text-violet-700">{m.kit}</span> : null}
                      </div>
                    </Link>
                  ))}
                  {!items.length ? <p className="px-2 py-6 text-center text-xs text-ink-mute">Sin muestras</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Vacio icono={Icon.flask} titulo="No hay muestras en proceso" />
      )}
      <section className="card mt-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 font-bold">Perfiles cargados</h2>
        <div className="overflow-x-auto">
          <table className="tabla w-full">
            <thead className="bg-surface/60">
              <tr>
                <th>Muestra</th>
                <th>Sticker</th>
                <th>Estado</th>
                <th>Kit</th>
                <th className="hidden md:table-cell">Días en laboratorio</th>
                <th className="hidden md:table-cell">Material</th>
              </tr>
            </thead>
            <tbody>
              {listas.map((m) => (
                <tr key={m.codigo}>
                  <td className="font-mono font-semibold">{m.codigo}</td>
                  <td>
                    <Link to={`/stickers/${m.sticker}/perfil`} className="font-mono text-sm hover:text-celeste-700">
                      {m.sticker}
                    </Link>
                  </td>
                  <td>
                    <ChipEstado estado={m.estado} />
                  </td>
                  <td className="text-sm">{m.kit}</td>
                  <td className="hidden font-mono text-sm md:table-cell">{m.diasEnLab}</td>
                  <td className="hidden text-sm md:table-cell">{m.materialRestante ? 'Queda material' : 'Agotado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
