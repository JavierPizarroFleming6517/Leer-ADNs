import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La app llama a la API en /api (mismo origen). Vite la redirige al servidor NestJS.
// Así un celular en la misma red solo necesita llegar al puerto 5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: process.env.API_URL ?? 'http://127.0.0.1:3000', changeOrigin: false, xfwd: true },
    },
  },
  preview: { port: 5173, host: true },
});
