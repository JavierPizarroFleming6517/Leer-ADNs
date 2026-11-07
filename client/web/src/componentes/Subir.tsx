import { type DragEvent, type ReactNode, useRef, useState } from 'react';
import { Icon, Spinner } from '../ui';

// Zona para arrastrar o elegir un archivo.
export function Subir({
  onArchivo,
  acepta,
  titulo,
  formatos = [],
  cargando = false,
  compacto = false,
  testid,
  children,
}: {
  onArchivo: (f: File) => void;
  acepta?: string;
  titulo: string;
  formatos?: string[];
  cargando?: boolean | string;
  compacto?: boolean;
  testid?: string;
  children?: ReactNode;
}) {
  const [encima, setEncima] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function soltar(e: DragEvent) {
    e.preventDefault();
    setEncima(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onArchivo(f);
  }
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
        disabled={Boolean(cargando)}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition ${
          compacto ? 'px-4 py-6' : 'px-6 py-10'
        } ${encima ? 'border-celeste-400 bg-celeste-50' : 'border-line bg-surface hover:border-celeste-200 hover:bg-celeste-50/60'}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-celeste-600 shadow-card">
          {cargando ? <Spinner className="h-5 w-5" /> : <Icon.upload className="h-6 w-6" />}
        </span>
        <span className="mt-3 text-sm font-semibold text-ink">{typeof cargando === 'string' && cargando ? cargando : titulo}</span>
        {formatos.length ? (
          <span className="mt-2 flex flex-wrap justify-center gap-1.5">
            {formatos.map((t) => (
              <span key={t} className="chip bg-white font-mono text-[11px] text-ink-soft ring-1 ring-line">
                {t}
              </span>
            ))}
          </span>
        ) : null}
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={acepta}
        className="hidden"
        data-testid={testid}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(f);
          e.target.value = '';
        }}
      />
    </>
  );
}
