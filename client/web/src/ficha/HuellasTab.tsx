import { useState } from 'react';
import { post } from '../api';
import { type EstadoCasilla, Manos } from '../componentes/Manos';
import { LeyendaMinucias, VisorHuella } from '../componentes/VisorHuella';
import { useSesion } from '../sesion';
import type { Minucia } from '../tipos';
import { DEDOS } from '../tipos';
import { Aviso, Dato, Hash, Icon, Vacio, fecha, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

type Control = {
  comparadas: number;
  umbral: number;
  millis: number;
  puntajeMaximo: number;
  duplicados: { stickerCodigo: string; dedo: string; puntaje: number; persona: { nombre: string } | null }[];
};
type RespuestaHuella = { huella: { id: string; posicion: number; dedo: string; cantidadMinucias: number; minucias: Minucia[] }; control: Control };

export default function HuellasTab({ f, recargar }: TabProps) {
  const { puede } = useSesion();
  const edita = puede('ADMIN', 'OPERADOR_TOMA') && Boolean(f.persona) && !f.sticker.anulado;
  const [origen, setOrigen] = useState<'ESCANER' | 'FOTO'>('ESCANER');
  const [dpi, setDpi] = useState(500);
  const [estados, setEstados] = useState<Record<number, EstadoCasilla>>({});
  const [seleccion, setSeleccion] = useState<number | null>(f.huellas[0]?.posicion ?? null);
  const [minucias, setMinucias] = useState(true);
  const [ultimo, setUltimo] = useState<{ dedo: string; control: Control; minucias: number } | null>(null);
  const noObt = Object.fromEntries((f.toma?.dedosNoObtenibles ?? []).map((d) => [d.posicion, d.motivo]));

  async function subir(pos: number, archivo: File) {
    setEstados((e) => ({ ...e, [pos]: { cargando: true } }));
    setUltimo(null);
    try {
      const fd = new FormData();
      fd.append('imagen', archivo);
      fd.append('posicion', String(pos));
      fd.append('origen', origen);
      fd.append('dpi', String(dpi));
      const r = await post<RespuestaHuella>(`/stickers/${f.sticker.codigo}/huellas`, fd);
      setEstados((e) => ({ ...e, [pos]: {} }));
      setUltimo({ dedo: r.huella.dedo, control: r.control, minucias: r.huella.cantidadMinucias });
      setSeleccion(pos);
      recargar();
    } catch (err) {
      setEstados((e) => ({ ...e, [pos]: { error: mensaje(err) } }));
      setTimeout(() => setEstados((e) => ({ ...e, [pos]: {} })), 6000);
    }
  }

  const sel = f.huellas.find((h) => h.posicion === seleccion);
  return (
    <div className="space-y-5">
      {ultimo ? (
        ultimo.control.duplicados.length ? (
          <Aviso tono="error" titulo={`Alerta: ${ultimo.dedo} coincide con una huella de otro sticker`}>
            {ultimo.control.duplicados.map((d) => (
              <span key={d.stickerCodigo + d.dedo} className="block">
                {d.dedo} del sticker <span className="font-mono font-semibold">{d.stickerCodigo}</span>
                {d.persona ? ` (${d.persona.nombre})` : ''} · puntaje {d.puntaje.toFixed(1)} (umbral {ultimo.control.umbral})
              </span>
            ))}
            <span className="mt-1 block text-xs">Comparada 1:N contra {ultimo.control.comparadas} huellas registradas en {ultimo.control.millis} ms. Quedó en la custodia y en la auditoría.</span>
          </Aviso>
        ) : (
          <Aviso tono="ok" titulo={`${ultimo.dedo}: ${ultimo.minucias} minucias extraídas · sin duplicados`}>
            Comparada 1:N contra {ultimo.control.comparadas} huellas de otros stickers en {ultimo.control.millis} ms. Puntaje más alto {ultimo.control.puntajeMaximo.toFixed(1)}, bajo el umbral {ultimo.control.umbral}.
          </Aviso>
        )
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Seccion
          titulo="Diagrama de manos"
          icono={Icon.fingerprint}
          acciones={
            edita ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
                  {(['ESCANER', 'FOTO'] as const).map((o) => (
                    <button key={o} type="button" onClick={() => setOrigen(o)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${origen === o ? 'bg-white text-ink shadow-sm' : 'text-ink-mute'}`} data-testid={`origen-${o}`}>
                      {o === 'ESCANER' ? 'Escáner' : 'Foto'}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                  DPI
                  <select className="input w-auto py-1 text-xs" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} data-testid="dpi">
                    {[500, 569, 600, 1000].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null
          }
        >
          <Manos
            posiciones={f.sticker.plantilla.posiciones}
            huellas={f.huellas}
            noObtenibles={noObt}
            estados={estados}
            seleccion={seleccion}
            habilitada={edita}
            onArchivo={(p, a) => void subir(p, a)}
            onSeleccionar={setSeleccion}
          />
          <p className="mt-5 text-center text-xs text-ink-mute">
            {edita
              ? 'Arrastra la imagen digitalizada (PNG, JPEG o TIFF) sobre cada dedo, o haz clic. La plantilla se extrae con el DPI indicado: SourceAFIS no es invariante a escala.'
              : f.persona
                ? 'Huellas digitalizadas del sticker.'
                : 'Asocia primero una persona al sticker.'}
          </p>
        </Seccion>

        <Seccion titulo={sel ? `${sel.posicion} · ${sel.dedo}` : 'Detalle de la huella'} icono={Icon.eye} acciones={sel ? <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft"><input type="checkbox" checked={minucias} onChange={(e) => setMinucias(e.target.checked)} /> Minucias</label> : null}>
          {sel ? (
            <div className="space-y-4" data-testid="detalle-huella">
              <div className="mx-auto max-w-[360px] rounded-xl border border-line p-2">
                <VisorHuella huellaId={sel.id} ancho={sel.ancho} alto={sel.alto} minucias={sel.minucias} mostrar={minucias} />
              </div>
              <LeyendaMinucias total={sel.cantidadMinucias} />
              {sel.duplicados.length ? (
                <Aviso tono="error" titulo="Posible duplicado">
                  {sel.duplicados.map((d, i) => (
                    <span key={i} className="block">
                      {d.dedo} de <span className="font-mono">{d.sticker}</span>
                      {d.persona ? ` (${d.persona})` : ''} · puntaje {d.puntaje.toFixed(1)}
                    </span>
                  ))}
                </Aviso>
              ) : null}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Dato etiqueta="Origen" valor={sel.origen === 'ESCANER' ? 'Escáner' : 'Foto'} />
                <Dato etiqueta="DPI" valor={sel.dpi} mono />
                <Dato etiqueta="Tamaño" valor={`${sel.ancho}×${sel.alto}`} mono />
                <Dato etiqueta="Cargada" valor={fecha(sel.creada)} />
              </dl>
              <div className="space-y-1 rounded-xl bg-surface p-3 text-xs">
                <p className="text-ink-mute">Archivo original (sin modificar): {sel.archivoNombre}</p>
                <p className="text-ink-mute">
                  SHA-256 imagen <Hash valor={sel.sha256Imagen} corto />
                </p>
                <p className="text-ink-mute">
                  SHA-256 plantilla <Hash valor={sel.sha256Plantilla} corto />
                </p>
              </div>
            </div>
          ) : seleccion && noObt[seleccion] ? (
            <Vacio icono={Icon.x} titulo={`${DEDOS[seleccion]}: no obtenible`}>
              {noObt[seleccion]}
            </Vacio>
          ) : (
            <Vacio icono={Icon.fingerprint} titulo="Sin huella seleccionada">
              Elige un dedo con huella para ver la imagen y sus minucias.
            </Vacio>
          )}
        </Seccion>
      </div>
    </div>
  );
}
