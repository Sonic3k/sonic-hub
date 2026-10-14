import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on :3100 (npm run dev -w @learn/api); /api is proxied to it.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3100', '/media': 'http://localhost:3100' } },
  preview: { port: 4173 },
  build: { sourcemap: true },
});
