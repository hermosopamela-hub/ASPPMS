import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The browser app lives in web/ and is built into dist/, which server.js serves.
// `npm run web` starts a dev server on :5173 that forwards /api and /auth to the Express app.
const API = process.env.API_URL || 'http://localhost:8080';

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/api': API, '/auth': API },
  },
});
