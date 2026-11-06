import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useCarga, useSesion } from '../sesion';
import type { PersonaVista } from '../tipos';
import { Aviso, Cargando, ChipEstado, Encabezado, Icon, Vacio, fecha } from '../ui';

type Fila = PersonaVista & { stickers: { codigo: string; estado: string; vinculado: boolean }[]; consentimientos: number };

export default function Personas() {
  const { puede } = useSesion();
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);
  const { datos, cargando, error } = useCarga(() => api<Fila[]>(`/personas${q ? `?q=${encodeURIComponent(q)}` : ''}`), [q]);
  return (
    <div>
      <Encabezado eyebrow="Datos personales" titulo="Personas">
        Los datos sensibles están en una tabla separada. Documento y fecha de nacimiento se guardan cifrados; la búsqueda por documento usa un índice ciego HMAC.
      </Encabezado>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-[240px] flex-1">
            <Icon.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
            <input className="input pl-9" placeholder="Buscar por nombre o número de documento exacto" value={texto} onChange={(e) => setTexto(e.target.value)} data-testid="buscar-persona" />
          </div>
          <span className="chip bg-celeste-50 text-celeste-700">
            <Icon.lock className="h-3.5 w-3.5" /> {puede('ADMIN') ? 'Documento visible (administración)' : 'Documento enmascarado para tu rol'}
          </span>
        </div>
        {error ? <Aviso tono="error" titulo={error} className="m-4" /> : null}
        {cargando && !datos ? (
          <Cargando />
        ) : !datos?.length ? (
          <div className="p-6">
            <Vacio icono={Icon.users} titulo={q ? 'Nadie coincide con la búsqueda' : 'Aún no hay personas registradas'} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla w-full">
              <thead className="bg-surface/60">
                <tr>
                  <th>Persona</th>
                  <th>Documento</th>
                  <th className="hidden md:table-cell">Nacionalidad</th>
                  <th>Sticker</th>
                  <th className="hidden lg:table-cell">Consentimiento</th>
                  <th className="hidden lg:table-cell">Registro</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((p) => (
                  <tr key={p.id} className="transition hover:bg-celeste-50/40">
                    <td>
                      <p className="font-semibold">
                        {p.nombres} {p.apellidos}
                      </p>
                      <p className="text-xs text-ink-mute">{p.institucion ?? '—'}</p>
                    </td>
                    <td>
                      <span className="text-xs text-ink-mute">{p.tipoDocumento}</span> <span className="font-mono text-sm">{p.documento ?? 'oculto'}</span>
                    </td>
                    <td className="hidden text-sm md:table-cell">{p.nacionalidad}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {p.stickers.map((s) => (
                          <Link key={s.codigo} to={`/stickers/${s.codigo}`} className="flex items-center gap-2 hover:text-celeste-700">
                            <span className="font-mono text-sm font-semibold">{s.codigo}</span>
                            <ChipEstado estado={s.estado} />
                            {s.vinculado ? <Icon.shield className="h-4 w-4 text-lima-600" /> : null}
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell">{p.consentimientos ? <span className="chip bg-lima-100 text-lima-800"><Icon.check className="h-3.5 w-3.5" /> Firmado</span> : <span className="chip bg-amber-100 text-amber-800">Pendiente</span>}</td>
                    <td className="hidden text-xs text-ink-mute lg:table-cell">{fecha(p.createdAt, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
