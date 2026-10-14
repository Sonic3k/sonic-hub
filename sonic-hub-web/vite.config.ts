import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3001 },
  /* the Tử vi knowledge base is one lazy data chunk of ~1 MB (gzip ~240 kB), loaded only in Huyền học */
  build: { chunkSizeWarningLimit: 1200 },
})
