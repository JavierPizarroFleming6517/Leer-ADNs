// Levanta el microservicio afis para "npm run dev" (lo compila si cambió el código).
// Si ya hay un afis respondiendo en AFIS_URL (p. ej. de otra terminal), lo reutiliza.
import { afisUrl, afisVivo, compilarAfis, lanzarAfis, verificarJava } from './comun.mjs';

if (await afisVivo()) {
  console.log(`afis ya está corriendo en ${afisUrl()}: se reutiliza. (Para reiniciarlo: pkill -f afis.jar)`);
  // Se mantiene vivo para que concurrently no detenga a la API ni a la web.
  setInterval(async () => {
    if (!(await afisVivo())) {
      console.error('El afis externo dejó de responder. Vuelve a ejecutar npm run dev.');
      process.exit(1);
    }
  }, 10_000);
} else {
  verificarJava();
  compilarAfis();
  const p = lanzarAfis('inherit');
  const fin = () => p.kill();
  process.on('SIGINT', fin);
  process.on('SIGTERM', fin);
  p.on('exit', (c) => process.exit(c ?? 0));
}
