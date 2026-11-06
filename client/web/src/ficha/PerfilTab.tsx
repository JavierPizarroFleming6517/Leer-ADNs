import { useState } from 'react';
import { descargar, post } from '../api';
import { Subir } from '../componentes/Subir';
import { GrillaMarcadores, Indicadores, Leyenda, VisorJson } from '../perfil';
import { useSesion } from '../sesion';
import type { Resumen } from '../tipos';
import { Aviso, Dato, Hash, Icon, Vacio, fecha, mensaje } from '../ui';
import { Seccion, type TabProps } from './Ficha';

type Resultado = {
  codigoMuestra: string;
  formato: string;
  kit: string;
  resumen: Resumen;
  faltantesKit: string[];
  coincidencias: { stickerCodigo: string; codigoMuestra: string; persona: { nombre: string } | null; lociComparados: number }[];
  archivoSha256: string;
};

export default function PerfilTab({ f, recargar }: TabProps) {
  const { puede } = useSesion();
  const edita = puede('ADMIN', 'LABORATORIO');
  const [cargando, setCargando] = useState(false);
  const [rechazo, setRechazo] = useState<{ archivo: string; motivo: string } | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function subir(a: File) {
    setCargando(true);
    setRechazo(null);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append('archivo', a);
      const r = await post<Resultado>(`/stickers/${f.sticker.codigo}/perfil`, fd);
      setResultado(r);
      recargar();
    } catch (e) {
      setRechazo({ archivo: a.name, motivo: mensaje(e) });
    } finally {
      setCargando(false);
    }
  }

  const avisos = (
    <>
      {rechazo ? (
        <div className="aparecer overflow-hidden rounded-2xl border border-red-200 bg-red-50" data-testid="perfil-rechazado">
          <div className="flex gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
              <Icon.x className="h-6 w-6" />
            </span>
            <div className="text-sm text-red-900">
              <p className="text-base font-bold">Archivo rechazado</p>
              <p className="mt-1">{rechazo.motivo}</p>
              <p className="mt-2 text-xs text-red-800/80">{rechazo.archivo} · el intento quedó en la auditoría. No se guardó ningún dato del archivo.</p>
            </div>
          </div>
        </div>
      ) : null}
      {resultado ? (
        <div className="aparecer space-y-3" data-testid="perfil-aceptado">
          <Aviso tono="ok" titulo={`Perfil aceptado · ${resultado.resumen.codisPresentes}/20 CODIS · muestra ${resultado.codigoMuestra}`}>
            {resultado.formato} validado contra el kit {resultado.kit}. SHA-256 del archivo <Hash valor={resultado.archivoSha256} corto />
          </Aviso>
          {resultado.coincidencias.length ? (
            <Aviso tono="alerta" titulo="Coincide con un perfil ya registrado">
              {resultado.coincidencias.map((c) => (
                <span key={c.stickerCodigo} className="block">
                  Sticker <span className="font-mono">{c.stickerCodigo}</span> {c.persona ? `(${c.persona.nombre})` : ''} · {c.lociComparados} loci idénticos
                </span>
              ))}
            </Aviso>
          ) : (
            <Aviso tono="ok" titulo="Sin coincidencias en el registro">El perfil se comparó con todos los perfiles registrados y no coincide con ninguno.</Aviso>
          )}
          {resultado.faltantesKit.length ? <Aviso tono="alerta" titulo="Loci del kit sin dato">{resultado.faltantesKit.join(', ')}</Aviso> : null}
        </div>
      ) : null}
    </>
  );

  if (!f.perfil) {
    return (
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Seccion titulo="Cargar perfil genético" icono={Icon.dna}>
          {!f.muestra ? (
            <Vacio icono={Icon.flask} titulo="La muestra aún no llega al laboratorio" />
          ) : edita ? (
            <div className="space-y-4">
              <Subir
                acepta=".xml,.xlsx,.csv"
                titulo="Arrastra el archivo del laboratorio o haz clic"
                formatos={['CODIS CMF · .xml', 'Planilla · .xlsx', 'Tabla · .csv']}
                cargando={cargando ? 'Validando custodia, kit y registro…' : false}
                onArchivo={(a) => void subir(a)}
                testid="subir-perfil"
              />
              {avisos}
            </div>
          ) : (
            <Vacio icono={Icon.dna} titulo="Perfil pendiente">El laboratorio carga el perfil al terminar la interpretación.</Vacio>
          )}
        </Seccion>
        <Seccion titulo="Validaciones al cargar" icono={Icon.shield}>
          <ul className="space-y-3 text-sm">
            {[
              ['Custodia', `El SPECIMENID o nombre de muestra del archivo debe ser ${f.muestra?.codigo ?? 'el código de la muestra'}. Si no, se rechaza.`],
              ['Kit', `Los loci deben corresponder al kit declarado${f.muestra?.kit ? ` (${f.muestra.kit})` : ''}.`],
              ['Formato', 'XML sin DTD ni entidades, alelos válidos, máximo 5 MB.'],
              ['Registro', 'Se compara contra todos los perfiles registrados (coincidencia exacta, mínimo 10 loci).'],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-lima-600" />
                <span>
                  <span className="font-semibold">{t}.</span> <span className="text-ink-soft">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      </div>
    );
  }

  const p = f.perfil;
  return (
    <div className="space-y-5">
      {avisos}
      <Seccion
        titulo={`Perfil STR · muestra ${p.codigoMuestra}`}
        icono={Icon.dna}
        acciones={
          p.archivoId ? (
            <button type="button" className="btn-secondary btn-sm" onClick={() => void descargar(`/archivos/${p.archivoId}`, p.archivoNombre)}>
              <Icon.download className="h-4 w-4" /> Archivo original
            </button>
          ) : null
        }
      >
        <Indicadores resumen={p.resumen} />
        <dl className="mt-5 grid gap-3 sm:grid-cols-4">
          <Dato etiqueta="Kit" valor={p.kit} />
          <Dato etiqueta="Formato de origen" valor={p.formato} />
          <Dato etiqueta="Cargado" valor={fecha(p.cargado)} />
          <Dato etiqueta="Archivo" valor={p.archivoNombre} />
        </dl>
        <p className="mt-2 text-xs text-ink-mute">
          SHA-256 del archivo <Hash valor={p.archivoSha256} corto />
        </p>
        <div className="mt-5 space-y-4">
          {p.marcadores ? (
            <>
              <GrillaMarcadores marcadores={p.marcadores} />
              <Leyenda />
              <VisorJson titulo="JSON normalizado del perfil" valor={p.marcadores} />
            </>
          ) : (
            <Aviso tono="info" titulo="Tu rol ve el resumen del perfil, no los alelos">
              Los genotipos completos solo son visibles para administración y laboratorio.
            </Aviso>
          )}
        </div>
      </Seccion>
    </div>
  );
}
