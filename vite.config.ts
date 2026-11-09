import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

export default defineConfig({
  // cloudflare(): menjalankan Worker + database D1 lokal saat `npm run dev`,
  // dan menyiapkan hasil build untuk `wrangler deploy`.
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(process.env.CF_PERSIST_PATH ? { persistState: { path: process.env.CF_PERSIST_PATH } } : {}),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
