import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useCarga } from '../sesion';
import { Cargando, ChipRol, Encabezado, Icon, Vacio, fecha } from '../ui';

type Registro = { id: string; usuarioNombre: string | null; rol: string | null; accion: string; recurso: string | null; detalle: Record<string, unknown> | null; ip: string | null; exito: boolean; fecha: string };

const NOMBRES: Record<string, string> = {
  LOGIN: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Inicio de sesión fallido',
  QR_FALSO: 'QR falso o no emitido',
  ESCANEO_QR: 'Escaneo de QR',
  CONSULTA_FICHA: 'Consulta de expediente',
  CONSULTA_PERSONAS: 'Consulta de personas',
  BUSCAR_PERSONA_DOCUMENTO: 'Búsqueda por documento',
  ASOCIAR_PERSONA: 'Asociación de persona',
  INTENTO_REVINCULAR_STICKER: 'Intento de re-vincular sticker',
  SUBIR_CONSENTIMIENTO: 'Consentimiento adjuntado',
  REGISTRAR_TOMA: 'Toma registrada',
  REGISTRAR_ENVIO: 'Envío registrado',
  DIGITALIZAR_HUELLA: 'Huella digitalizada',
  ALERTA_HUELLA_DUPLICADA: 'Alerta de huella duplicada',
  RECEPCION_LAB: 'Recepción en laboratorio',
  ETAPA_LAB: 'Etapa de laboratorio',
  ADJUNTAR_ARCHIVO: 'Archivo adjuntado',
  PERFIL_CARGADO: 'Perfil cargado',
  PERFIL_RECHAZADO: 'Perfil rechazado',
  FIRMAR_VINCULO: 'Vínculo firmado',
  VERIFICAR_VINCULO: 'Verificación de vínculo',
  VERIFICAR_CADENA: 'Verificación de cadena',
  VERIFICACION_HUELLA: 'Verificación por huella',
  VERIFICACION_PERFIL: 'Verificación por perfil',
  CREAR_LOTE: 'Lote creado',
  DESCARGAR_CSV_LOTE: 'CSV de lote descargado',
  CONSULTA_CUSTODIA: 'Consulta de custodia',
  CONSULTA_AUDITORIA: 'Consulta de auditoría',
  DESCARGAR_ARCHIVO: 'Descarga de archivo',
  DESCARGAR_CONSENTIMIENTO: 'Descarga de consentimiento',
  FINALIZAR_MUESTRA: 'Muestra finalizada',
  CREAR_USUARIO: 'Usuario creado',
};

export default function Auditoria() {
  const [params] = useSearchParams();
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [accion, setAccion] = useState(params.get('accion') ?? '');
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);
  const qs = new URLSearchParams({ ...(q && { q }), ...(accion && { accion }) }).toString();
  const { datos, cargando } = useCarga(() => api<{ items: Registro[]; acciones: { accion: string; total: number }[] }>(`/auditoria?${qs}`), [qs]);
  return (
    <div>
      <Encabezado eyebrow="Seguridad" titulo="Auditoría">
        Quién consultó o hizo qué, cuándo y desde qué IP (últimos 100 registros; filtra para ver más). Los detalles nunca incluyen datos personales.
      </Encabezado>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <div className="relative min-w-[240px] flex-1">
            <Icon.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
            <input className="input pl-9" placeholder="Usuario, recurso o IP" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <select className="input w-auto" value={accion} onChange={(e) => setAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {datos?.acciones.map((a) => (
              <option key={a.accion} value={a.accion}>
                {NOMBRES[a.accion] ?? a.accion} ({a.total})
              </option>
            ))}
          </select>
        </div>
        {cargando && !datos ? (
          <Cargando />
        ) : !datos?.items.length ? (
          <div className="p-6">
            <Vacio icono={Icon.list} titulo="Sin registros" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabla w-full">
              <thead className="bg-surface/60">
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th className="hidden md:table-cell">Recurso</th>
                  <th className="hidden lg:table-cell">Detalle</th>
                  <th className="hidden sm:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {datos.items.map((r) => (
                  <tr key={r.id} className={r.exito ? '' : 'bg-red-50/60'}>
                    <td className="whitespace-nowrap text-xs text-ink-soft">{fecha(r.fecha)}</td>
                    <td>
                      <p className="text-sm font-semibold">{r.usuarioNombre ?? 'Anónimo'}</p>
                      {r.rol ? <ChipRol rol={r.rol} /> : null}
                    </td>
                    <td className="text-sm">
                      <span className={`inline-flex items-center gap-1.5 ${r.exito ? '' : 'font-semibold text-red-700'}`}>
                        {r.exito ? null : <Icon.alert className="h-4 w-4" />}
                        {NOMBRES[r.accion] ?? r.accion}
                      </span>
                    </td>
                    <td className="hidden font-mono text-xs md:table-cell">{r.recurso ?? '—'}</td>
                    <td className="hidden max-w-[320px] truncate font-mono text-[11px] text-ink-mute lg:table-cell" title={r.detalle ? JSON.stringify(r.detalle) : ''}>
                      {r.detalle ? JSON.stringify(r.detalle) : '—'}
                    </td>
                    <td className="hidden font-mono text-xs text-ink-mute sm:table-cell">{r.ip ?? '—'}</td>
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
