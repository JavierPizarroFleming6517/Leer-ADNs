import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useCarga } from '../sesion';
import type { Evento } from '../tipos';
import { NOMBRE_ETAPA } from '../tipos';
import { Cargando, ChipEstado, Encabezado, Hash, Icon, Vacio, fecha } from '../ui';

type Fila = Evento & { sticker: { codigo: string; estado: string } };

export default function Custodia() {
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);
  const qs = new URLSearchParams({ ...(q && { q }), ...(tipo && { tipo }) }).toString();
  const { datos, cargando } = useCarga(() => api<Fila[]>(`/custodia?${qs}`), [qs]);
  return (
    <div>
      <Encabezado eyebrow="Trazabilidad" titulo="Cadena de custodia">
        Todos los eventos de todos los stickers. Solo inserción: un trigger de PostgreSQL rechaza cualquier UPDATE o DELETE. Busca por código de sticker, responsable o prefijo de hash.
      </Encabezado>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <div className="relative min-w-[240px] flex-1">
            <Icon.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
            <input className="input pl-9" placeholder="TG-…, responsable o hash SHA-256" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <select className="input w-auto" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los eventos</option>
            {Object.entries(NOMBRE_ETAPA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {cargando && !datos ? (
          <Cargando />
        ) : !datos?.length ? (
          <div className="p-6">
            <Vacio icono={Icon.chain} titulo="Sin eventos para esa búsqueda" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla w-full">
              <thead className="bg-surface/60">
                <tr>
                  <th>Fecha</th>
                  <th>Sticker</th>
                  <th>Evento</th>
                  <th className="hidden md:table-cell">Responsable</th>
                  <th className="hidden lg:table-cell">Hash del evento</th>
                  <th className="hidden xl:table-cell">Archivo</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((e) => (
                  <tr key={e.id} className="hover:bg-celeste-50/40">
                    <td className="whitespace-nowrap text-xs text-ink-soft">{fecha(e.fecha)}</td>
                    <td>
                      <Link to={`/stickers/${e.sticker.codigo}/custodia`} className="flex items-center gap-2 hover:text-celeste-700">
                        <span className="font-mono text-sm font-semibold">{e.sticker.codigo}</span>
                        <span className="hidden sm:inline">
                          <ChipEstado estado={e.sticker.estado} />
                        </span>
                      </Link>
                    </td>
                    <td className="text-sm">
                      <span className="mr-1.5 font-mono text-xs text-ink-mute">#{e.secuencia}</span>
                      {NOMBRE_ETAPA[e.tipo]}
                    </td>
                    <td className="hidden text-sm md:table-cell">{e.responsableNombre}</td>
                    <td className="hidden lg:table-cell">
                      <Hash valor={e.hashEvento} corto />
                    </td>
                    <td className="hidden xl:table-cell">{e.archivoSha256 ? <Hash valor={e.archivoSha256} corto /> : <span className="text-ink-mute">—</span>}</td>
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
