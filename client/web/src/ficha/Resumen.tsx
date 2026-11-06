import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Aviso, Hash, Icon, fecha } from '../ui';
import type { TabProps } from './Ficha';

function Tarjeta({ a, titulo, icono: I, ok, children }: { a: string; titulo: string; icono: (p: { className?: string }) => ReactNode; ok: boolean | null; children: ReactNode }) {
  return (
    <Link to={a} replace className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-celeste-200 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${ok ? 'bg-lima-100 text-lima-800' : ok === false ? 'bg-amber-100 text-amber-700' : 'bg-surface text-ink-mute'}`}>
          <I className="h-5 w-5" />
        </span>
        <Icon.arrowRight className="h-4 w-4 text-ink-mute opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-mute">{titulo}</p>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </Link>
  );
}

export default function Resumen({ f }: TabProps) {
  const base = `/stickers/${f.sticker.codigo}`;
  const duplicados = f.huellas.flatMap((h) => h.duplicados.map((d) => ({ ...d, propio: h.dedo })));
  const posiciones = f.sticker.plantilla.posiciones.length;
  return (
    <div className="space-y-5">
      {duplicados.length ? (
        <Aviso tono="error" titulo="Posible huella duplicada">
          {duplicados.map((d, i) => (
            <span key={i} className="block">
              {d.propio} coincide con {d.dedo} del sticker <span className="font-mono font-semibold">{d.sticker}</span>
              {d.persona ? ` (${d.persona})` : ''} · puntaje SourceAFIS {d.puntaje.toFixed(1)}
            </span>
          ))}
        </Aviso>
      ) : null}
      {f.muestra && f.muestra.estadoSello !== 'INTACTO' ? (
        <Aviso tono="alerta" titulo={`Sello ${f.muestra.estadoSello === 'DANADO' ? 'dañado' : 'ausente'} al recibir en laboratorio`}>Quedó registrado en la cadena de custodia.</Aviso>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta a={`${base}/persona`} titulo="Persona" icono={Icon.user} ok={f.persona ? true : null}>
          {f.persona ? (
            <>
              <p className="font-semibold">
                {f.persona.nombres} {f.persona.apellidos}
              </p>
              <p className="text-xs text-ink-mute">
                {f.persona.tipoDocumento} {f.persona.documento ?? '(oculto para tu rol)'} · {f.persona.nacionalidad}
              </p>
              <p className="mt-1 text-xs text-ink-mute">{f.consentimientos.length ? `Consentimiento v${f.consentimientos[0].versionTexto}` : 'Sin consentimiento'}</p>
            </>
          ) : (
            <p className="text-ink-mute">Sin persona asociada</p>
          )}
        </Tarjeta>
        <Tarjeta a={`${base}/toma`} titulo="Toma" icono={Icon.clock} ok={f.toma ? true : null}>
          {f.toma ? (
            <>
              <p className="font-semibold">{fecha(f.toma.fechaHora)}</p>
              <p className="text-xs text-ink-mute">{f.toma.lugar}</p>
              <p className="text-xs text-ink-mute">Operador: {f.toma.operador}</p>
            </>
          ) : (
            <p className="text-ink-mute">Pendiente</p>
          )}
        </Tarjeta>
        <Tarjeta a={`${base}/huellas`} titulo="Huellas" icono={Icon.fingerprint} ok={f.huellas.length ? (duplicados.length ? false : true) : null}>
          <p className="font-semibold">
            {f.huellas.length} de {posiciones} dedos
          </p>
          <p className="text-xs text-ink-mute">
            {f.huellas.reduce((n, h) => n + h.cantidadMinucias, 0)} minucias en total
            {f.toma?.dedosNoObtenibles.length ? ` · ${f.toma.dedosNoObtenibles.length} no obtenible` : ''}
          </p>
          {duplicados.length ? <p className="text-xs font-semibold text-red-700">Posible duplicado</p> : null}
        </Tarjeta>
        <Tarjeta a={`${base}/laboratorio`} titulo="Muestra biológica" icono={Icon.flask} ok={f.muestra ? true : null}>
          {f.muestra ? (
            <>
              <p className="font-mono font-semibold">{f.muestra.codigo}</p>
              <p className="text-xs text-ink-mute">
                {f.muestra.etapaNombre} · {f.muestra.laboratorio}
              </p>
              {f.muestra.adnUgMl !== null ? <p className="text-xs text-ink-mute">ADN {f.muestra.adnUgMl} µg/ml</p> : null}
            </>
          ) : (
            <p className="text-ink-mute">No recibida en laboratorio</p>
          )}
        </Tarjeta>
        <Tarjeta a={`${base}/perfil`} titulo="Perfil genético" icono={Icon.dna} ok={f.perfil ? f.perfil.resumen.completoCodis : null}>
          {f.perfil ? (
            <>
              <p className="font-semibold">
                <span className="font-mono">{f.perfil.resumen.codisPresentes}/20</span> loci CODIS
              </p>
              <p className="text-xs text-ink-mute">
                {f.perfil.kit} · {f.perfil.formato}
              </p>
            </>
          ) : (
            <p className="text-ink-mute">Pendiente</p>
          )}
        </Tarjeta>
        <Tarjeta a={`${base}/vinculo`} titulo="Vínculo dactilogenético" icono={Icon.shield} ok={f.vinculo ? true : null}>
          {f.vinculo ? (
            <>
              <p className="font-semibold">Firmado (Ed25519)</p>
              <p className="text-xs text-ink-mute">
                {fecha(f.vinculo.firmadoEn)} · {f.vinculo.firmadoPor}
              </p>
            </>
          ) : (
            <p className="text-ink-mute">{f.persona && f.huellas.length && f.perfil ? 'Listo para firmar' : 'Requiere persona, huellas y perfil'}</p>
          )}
        </Tarjeta>
        <Tarjeta a={`${base}/custodia`} titulo="Cadena de custodia" icono={Icon.chain} ok={true}>
          <p className="font-semibold">{f.custodia.total} eventos</p>
          <p className="text-xs text-ink-mute">Último hash</p>
          <Hash valor={f.custodia.ultimoHash} corto />
        </Tarjeta>
        <div className="card flex flex-col p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink-mute">
            <Icon.box className="h-5 w-5" />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-mute">Fabricación</p>
          <p className="mt-1 font-mono text-sm font-semibold">Lote {f.sticker.lote.codigo}</p>
          <p className="text-xs text-ink-mute">
            Diseño v{f.sticker.lote.versionDiseno} · {fecha(f.sticker.lote.fechaFabricacion, false)}
          </p>
          <p className="text-xs text-ink-mute">{f.sticker.plantilla.nombre}</p>
        </div>
      </div>
    </div>
  );
}
