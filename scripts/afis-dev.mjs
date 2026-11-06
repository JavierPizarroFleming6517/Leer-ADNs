// Levanta el microservicio afis para "npm run dev" (lo compila si cambió el código).
import { compilarAfis, lanzarAfis, verificarJava } from './comun.mjs';

verificarJava();
compilarAfis();
const p = lanzarAfis('inherit');
const fin = () => p.kill();
process.on('SIGINT', fin);
process.on('SIGTERM', fin);
p.on('exit', (c) => process.exit(c ?? 0));
