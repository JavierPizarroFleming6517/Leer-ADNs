import { HttpException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { config } from '../common/config';

export type Minucia = { x: number; y: number; direction: number; type: string };
export type Extraccion = {
  template: string;
  minutiaCount: number;
  minutiae: Minucia[];
  width: number;
  height: number;
  dpi: number;
  png: string | null;
};
export type Puntaje = { id: string; score: number; match: boolean };

export const MOTOR_NO_DISPONIBLE = 'Motor biométrico no disponible. Inicia el servicio afis (npm run dev).';

// Cliente HTTP del microservicio afis (Java + SourceAFIS). Nunca simula resultados.
@Injectable()
export class AfisService {
  get umbral() {
    return config().afisUmbral;
  }

  async salud(): Promise<{ ok: boolean; version?: string; umbral?: number }> {
    try {
      const r = await fetch(`${config().afisUrl}/health`, { signal: AbortSignal.timeout(1500) });
      if (!r.ok) return { ok: false };
      const b = (await r.json()) as { version: string; threshold: number };
      return { ok: true, version: b.version, umbral: b.threshold };
    } catch {
      return { ok: false };
    }
  }

  async extraer(imagen: Buffer, dpi: number): Promise<Extraccion> {
    return this.post<Extraccion>('/extract', { image: imagen.toString('base64'), dpi });
  }

  async identificar(sonda: Buffer, candidatas: { id: string; plantilla: Buffer }[]) {
    if (!candidatas.length) return { threshold: this.umbral, results: [] as Puntaje[], millis: 0 };
    return this.post<{ threshold: number; results: Puntaje[]; millis: number }>('/identify', {
      probe: sonda.toString('base64'),
      threshold: this.umbral,
      candidates: candidatas.map((c) => ({ id: c.id, template: c.plantilla.toString('base64') })),
    });
  }

  private async post<T>(ruta: string, cuerpo: unknown): Promise<T> {
    let r: Response;
    try {
      r = await fetch(`${config().afisUrl}${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ServiceUnavailableException(MOTOR_NO_DISPONIBLE);
    }
    const b = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!r.ok || !b) {
      const msg = b?.error ?? 'El motor biométrico respondió con un error.';
      if (r.status === 400 || r.status === 422) throw new UnprocessableEntityException(msg);
      throw new HttpException(msg, 502);
    }
    return b;
  }
}
