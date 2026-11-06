import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useQr } from '../componentes/QrImagen';
import { useCarga, useSesion } from '../sesion';
import type { FichaSticker } from '../tipos';
import { AccionesSticker } from '../componentes/AccionesSticker';
import { Aviso, Cargando, ChipEstado, Icon, Modal, fecha } from '../ui';
import CustodiaTab from './CustodiaTab';
import HuellasTab from './HuellasTab';
import PerfilTab from './PerfilTab';
import PersonaTab from './PersonaTab';
import Resumen from './Resumen';
import TomaTab from './TomaTab';
import VinculoTab from './VinculoTab';

export type TabProps = { f: FichaSticker; recargar: () => void };

const PESTANAS = [
  { id: 'resumen', t: 'Resumen', i: Icon.home },
  { id: 'persona', t: 'Persona y consentimiento', i: Icon.user },
  { id: 'toma', t: 'Toma', i: Icon.clock },
  { id: 'huellas', t: 'Huellas', i: Icon.fingerprint },
  { id: 'perfil', t: 'Laboratorio y perfil', i: Icon.dna },
  { id: 'vinculo', t: 'Vínculo', i: Icon.shield },
  { id: 'custodia', t: 'Custodia', i: Icon.chain },
] as const;

// Ciclo de vida del sticker (documento de la genetista), con el laboratorio como actor externo.
export const CICLO = [
  { e: 'NUEVO', t: 'Nuevo', d: 'Fabricado, sin uso' },
  { e: 'PROCESADO', t: 'Procesado', d: 'Toma y huellas registradas' },
  { e: 'EN_USO', t: 'En uso', d: 'Perfil recibido, queda material' },
  { e: 'FINALIZADO', t: 'Finalizado', d: 'Sin material, se conserva el registro' },
];

function BarraCiclo({ estado }: { estado: string }) {
  const actual = CICLO.findIndex((c) => c.e === estado);
  return (
    <ol className="grid grid-cols-4 gap-2" data-testid="ciclo">
      {CICLO.map((c, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        return (
          <li key={c.e} className="min-w-0">
            <div className={`h-1.5 rounded-full transition-all ${hecho || activo ? (activo ? 'bg-celeste-600' : 'bg-lima-400') : 'bg-line'}`} />
            <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${activo ? 'text-ink' : hecho ? 'text-ink-soft' : 'text-ink-mute'}`}>
              {hecho ? <Icon.check className="h-3.5 w-3.5 text-lima-600" /> : null}
              {c.t}
            </p>
            <p className="hidden truncate text-[11px] text-ink-mute sm:block">{c.d}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function Ficha() {
  const { codigo = '', pestana = 'resumen' } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const { usuario } = useSesion();
  const { datos: f, error, cargando, recargar } = useCarga(() => api<FichaSticker>(`/stickers/${encodeURIComponent(codigo)}`), [codigo]);
  const [qrAbierto, setQrAbierto] = useState(false);
  const qr = useQr(f?.qrUrl, 640);
  const desdeQr = (loc.state as { desdeQr?: boolean; firmaVerificada?: boolean } | null) ?? null;
  if (!PESTANAS.some((p) => p.id === pestana)) return <Navigate to={`/stickers/${codigo}`} replace />;

  if (error) return <Aviso tono="error" titulo="No se pudo abrir el sticker">{error}</Aviso>;
  if (!f) return <Cargando texto="Abriendo expediente…" />;
  const actual = pestana;
  const props = { f, recargar };
  const operador = usuario && ['ADMIN', 'OPERADOR_TOMA'].includes(usuario.rol);
  const anulado = f.sticker.anulado;
  const sinUso = f.sticker.estado === 'NUEVO' && !f.persona;

  return (
    <div className={cargando ? 'opacity-90 transition' : ''}>
      {desdeQr?.desdeQr ? (
        <Aviso tono="ok" titulo={desdeQr.firmaVerificada ? 'QR auténtico: firma Ed25519 verificada' : 'Código encontrado en el registro de TrazaGen'} className="mb-5">
          {desdeQr.firmaVerificada ? 'El código fue emitido por esta plataforma y no fue alterado.' : 'Se ingresó el código a mano: el sticker existe, pero sin la firma del QR.'}
        </Aviso>
      ) : null}

      {anulado ? (
        <Aviso tono="error" titulo={`Sticker anulado el ${fecha(anulado.fecha)}`} className="mb-5">
          {anulado.motivo ?? 'Sin motivo registrado.'} Su registro y su cadena de custodia se conservan; ya no admite cambios ni participa en las búsquedas.
        </Aviso>
      ) : null}

      <section className="card mb-6 overflow-hidden">
        <div className="flex flex-wrap items-start gap-5 p-5 sm:p-6">
          <button type="button" onClick={() => setQrAbierto(true)} className="shrink-0 rounded-xl border border-line p-1.5 transition hover:border-celeste-200" title="Ver QR">
            {qr ? <img src={qr} alt="QR del sticker" className="h-20 w-20 sm:h-24 sm:w-24" /> : <div className="h-20 w-20 sm:h-24 sm:w-24" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">ID dactilogenético</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-wide sm:text-3xl" data-testid="codigo-sticker">{f.sticker.codigo}</h1>
              {anulado ? <span className="chip bg-red-100 text-red-700">Anulado</span> : <ChipEstado estado={f.sticker.estado} />}
              {f.vinculo ? (
                <span className="chip bg-ink text-white">
                  <Icon.shield className="h-3.5 w-3.5 text-lima-400" /> Vínculo firmado
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {f.persona ? (
                <span className="font-semibold text-ink">
                  {f.persona.nombres} {f.persona.apellidos}
                </span>
              ) : (
                'Sin persona asociada'
              )}
              <span className="text-ink-mute"> · Lote {f.sticker.lote.codigo} · {f.sticker.plantilla.nombre}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sinUso && operador && !anulado ? (
              <button type="button" className="btn-primary" onClick={() => nav(`/stickers/${f.sticker.codigo}/persona`)} data-testid="iniciar-toma">
                <Icon.arrowRight className="h-4 w-4" /> Iniciar toma
              </button>
            ) : null}
            {usuario?.rol === 'ADMIN' ? (
              <AccionesSticker codigo={f.sticker.codigo} sinUso={sinUso} anulado={Boolean(anulado)} onListo={(eliminado) => (eliminado ? nav('/stickers', { replace: true }) : recargar())} />
            ) : null}
          </div>
        </div>
        {anulado ? null : (
          <div className="border-t border-line bg-surface/50 px-5 py-4 sm:px-6">
            <BarraCiclo estado={f.sticker.estado} />
          </div>
        )}
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 sm:px-4" role="tablist">
          {PESTANAS.map((p) => (
            <Link
              key={p.id}
              to={`/stickers/${f.sticker.codigo}/${p.id}`}
              replace
              role="tab"
              aria-selected={actual === p.id}
              data-testid={`tab-${p.id}`}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                actual === p.id ? 'border-celeste-600 text-ink' : 'border-transparent text-ink-mute hover:text-ink'
              }`}
            >
              <p.i className="h-4 w-4" />
              {p.t}
            </Link>
          ))}
        </nav>
      </section>

      <div key={actual} className="aparecer">
        {actual === 'resumen' ? <Resumen {...props} /> : null}
        {actual === 'persona' ? <PersonaTab {...props} /> : null}
        {actual === 'toma' ? <TomaTab {...props} /> : null}
        {actual === 'huellas' ? <HuellasTab {...props} /> : null}
        {actual === 'perfil' ? <PerfilTab {...props} /> : null}
        {actual === 'vinculo' ? <VinculoTab {...props} /> : null}
        {actual === 'custodia' ? <CustodiaTab {...props} /> : null}
      </div>

      <Modal abierto={qrAbierto} onCerrar={() => setQrAbierto(false)} titulo={`QR · ${f.sticker.codigo}`}>
        {qr ? <img src={qr} alt="QR del sticker" className="mx-auto w-72" /> : null}
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-mute">Contenido del QR</p>
        <p className="mt-1 break-all rounded-lg bg-surface p-3 font-mono text-xs text-ink-soft">{f.qrUrl}</p>
        <p className="mt-3 text-xs leading-5 text-ink-mute">
          Solo contiene el código del sticker y su firma Ed25519 en base64url. No incluye datos personales, genéticos ni biométricos. Fabricado el {fecha(f.sticker.lote.fechaFabricacion, false)} en {f.sticker.lote.fabrica}.
        </p>
      </Modal>
    </div>
  );
}

export function Seccion({ titulo, icono: I, children, acciones, className = '' }: { titulo: string; icono?: (p: { className?: string }) => React.ReactNode; children: React.ReactNode; acciones?: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          {I ? <I className="h-5 w-5 text-celeste-600" /> : null}
          {titulo}
        </h2>
        {acciones}
      </div>
      {children}
    </section>
  );
}
