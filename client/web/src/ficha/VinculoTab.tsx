import { useState } from 'react';
import { post } from '../api';
import { VisorJson } from '../perfil';
import { useSesion } from '../sesion';
import type { ResultadoVinculo, VinculoVista } from '../tipos';
import { DEDOS } from '../tipos';
import { Aviso, Hash, Icon, Spinner, fecha, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

export function ResultadoIntegridad({ r }: { r: ResultadoVinculo }) {
  return (
    <div className={`aparecer overflow-hidden rounded-2xl border-2 ${r.valido ? 'border-lima-400 bg-lima-50' : 'border-red-300 bg-red-50'}`} data-testid={r.valido ? 'integridad-ok' : 'integridad-falla'}>
      <div className="flex items-center gap-4 p-5">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${r.valido ? 'pulso-ok bg-lima-400 text-ink' : 'bg-red-600 text-white'}`}>
          {r.valido ? <Icon.check className="h-8 w-8" /> : <Icon.x className="h-8 w-8" />}
        </span>
        <div>
          <p className={`text-lg font-bold ${r.valido ? 'text-lima-800' : 'text-red-800'}`}>{r.valido ? '✓ Vínculo íntegro' : '✗ Vínculo alterado'}</p>
          <p className={`text-sm ${r.valido ? 'text-lima-800/80' : 'text-red-800/80'}`}>
            {r.valido ? 'Se recalculó todo desde la base y coincide con lo firmado.' : 'Lo que hay hoy en la base no coincide con lo que se firmó.'} · {fecha(r.verificadoEn)}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-black/5 border-t border-black/5 bg-white/60">
        {r.comprobaciones.map((c) => (
          <li key={c.clave} className="flex items-start gap-3 px-5 py-2.5 text-sm">
            {c.ok ? <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-lima-600" /> : <Icon.x className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
            <span>
              <span className="font-semibold">{c.nombre}.</span> <span className="text-ink-soft">{c.detalle}</span>
            </span>
          </li>
        ))}
      </ul>
      {r.cambios.length ? (
        <div className="border-t border-red-200 bg-white p-5">
          <p className="mb-3 text-sm font-bold text-red-800">Qué cambió</p>
          <div className="overflow-x-auto">
            <table className="tabla w-full">
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Firmado / origen</th>
                  <th>Hoy en la base</th>
                </tr>
              </thead>
              <tbody>
                {r.cambios.map((c, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{c.campo}</td>
                    <td className="max-w-[260px] break-all font-mono text-xs text-ink-soft">{c.antes}</td>
                    <td className="max-w-[260px] break-all font-mono text-xs font-semibold text-red-700">{c.ahora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function VinculoTab({ f, recargar }: TabProps) {
  const { puede } = useSesion();
  const firma = puede('ADMIN', 'LABORATORIO');
  const [cargando, setCargando] = useState<'' | 'firmar' | 'verificar'>('');
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<ResultadoVinculo | null>(null);
  const requisitos = [
    { ok: Boolean(f.persona), t: 'Persona asociada al sticker' },
    { ok: f.huellas.length > 0, t: `Al menos una huella digitalizada (${f.huellas.length})` },
    { ok: Boolean(f.perfil), t: 'Perfil genético cargado' },
  ];
  const listo = requisitos.every((r) => r.ok);

  async function firmar() {
    setCargando('firmar');
    setError('');
    setResultado(null);
    try {
      await post<VinculoVista>(`/stickers/${f.sticker.codigo}/vinculo`);
      recargar();
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setCargando('');
    }
  }
  async function verificar() {
    setCargando('verificar');
    setError('');
    try {
      setResultado(await post<ResultadoVinculo>(`/stickers/${f.sticker.codigo}/vinculo/verificar`));
      recargar();
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setCargando('');
    }
  }

  if (!f.vinculo) {
    return (
      <Seccion titulo="Vínculo dactilogenético" icono={Icon.shield}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm leading-6 text-ink-soft">
              El vínculo une sticker, persona, plantillas de huella y perfil genético en un documento canónico firmado con Ed25519. No se calcula ningún hash a partir de datos biológicos: se firma el registro y cualquier alteración posterior se detecta.
            </p>
            <ul className="mt-5 space-y-2">
              {requisitos.map((r) => (
                <li key={r.t} className="flex items-center gap-3 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${r.ok ? 'bg-lima-400 text-ink' : 'bg-surface text-ink-mute'}`}>{r.ok ? <Icon.check className="h-3.5 w-3.5" /> : <Icon.x className="h-3.5 w-3.5" />}</span>
                  <span className={r.ok ? 'font-medium' : 'text-ink-mute'}>{r.t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-surface p-6 text-center">
            <Icon.pen className="h-8 w-8 text-celeste-600" />
            <p className="mt-3 font-semibold">{listo ? 'Todo listo para firmar' : 'Faltan requisitos'}</p>
            {firma ? (
              <button type="button" className="btn-primary mt-4 px-6 py-3" disabled={!listo || cargando !== ''} onClick={() => void firmar()} data-testid="firmar-vinculo">
                {cargando === 'firmar' ? <Spinner /> : <Icon.shield className="h-4 w-4" />} Firmar vínculo
              </button>
            ) : (
              <p className="mt-2 text-xs text-ink-mute">Lo firma laboratorio o administración.</p>
            )}
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          </div>
        </div>
      </Seccion>
    );
  }

  const v = f.vinculo;
  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-5 bg-ink p-6 text-white">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Icon.shield className="h-8 w-8 text-lima-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-lima-400">Vínculo dactilogenético vigente</p>
            <p className="mt-1 font-mono text-xl font-bold">{f.sticker.codigo}</p>
            <p className="text-sm text-celeste-100/80">
              Firmado {fecha(v.firmadoEn)} por {v.firmadoPor} · Ed25519
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn bg-lima-400 text-ink hover:bg-lima-400/90" onClick={() => void verificar()} disabled={cargando !== ''} data-testid="verificar-integridad">
              {cargando === 'verificar' ? <Spinner /> : <Icon.shield className="h-4 w-4" />} Verificar integridad
            </button>
            {firma ? (
              <button type="button" className="btn border border-white/20 text-white hover:bg-white/10" onClick={() => void firmar()} disabled={cargando !== ''} title="Firma un vínculo nuevo; el actual queda revocado">
                Regenerar
              </button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-3">
          {[
            ['Huellas firmadas', v.documento.huellas.map((h) => DEDOS[h.posicion]).join(', ')],
            ['Perfil firmado', `${v.documento.perfil.codigoMuestra} · ${v.documento.perfil.kit}`],
            ['SHA-256 del documento', null],
          ].map(([t, d], i) => (
            <div key={i} className="bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{t}</p>
              {d ? <p className="mt-1 text-sm font-semibold">{d}</p> : <Hash valor={v.documentoSha256} corto className="mt-1" />}
            </div>
          ))}
        </div>
      </section>
      {error ? <Aviso tono="error" titulo={error} /> : null}
      {resultado ? <ResultadoIntegridad r={resultado} /> : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <Seccion titulo="Documento canónico" icono={Icon.code}>
          <p className="mb-3 text-xs text-ink-soft">JSON con claves ordenadas y sin espacios: exactamente lo que se firmó.</p>
          <pre className="max-h-80 overflow-auto rounded-xl bg-ink p-4 font-mono text-[11px] leading-5 text-celeste-100">{JSON.stringify(v.documento, null, 2)}</pre>
          <div className="mt-3">
            <VisorJson titulo="Bytes firmados (forma canónica)" valor={v.documentoCanonico} />
          </div>
        </Seccion>
        <Seccion titulo="Firma y llave pública" icono={Icon.key}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Firma Ed25519 (base64)</p>
          <p className="mt-1 break-all rounded-xl bg-surface p-3 font-mono text-xs text-ink-soft">{v.firma}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-mute">Llave pública de TrazaGen</p>
          <pre className="mt-1 overflow-x-auto rounded-xl bg-surface p-3 font-mono text-[11px] text-ink-soft">{v.llavePublicaPem}</pre>
          <p className="mt-3 text-xs leading-5 text-ink-mute">
            Cualquiera con la llave pública puede verificar la firma sobre el documento canónico. La llave privada solo vive en el servidor (.env) y nunca se publica.
          </p>
          {f.vinculosRevocados.length ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Vínculos anteriores (revocados, nunca borrados)</p>
              <ul className="mt-2 space-y-1.5 text-xs">
                {f.vinculosRevocados.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line px-3 py-2 text-ink-soft">
                    Firmado {fecha(r.firmadoEn)} · revocado {fecha(r.revocadoEn)} · <Hash valor={r.documentoSha256} corto />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Seccion>
      </div>
    </div>
  );
}
