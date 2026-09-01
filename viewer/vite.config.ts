import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { port: 5173 },
  build: {
    outDir: '../dist-viewer',
    emptyOutDir: true
  }
});
