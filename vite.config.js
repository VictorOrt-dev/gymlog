import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' : le build marche tel quel sur GitHub Pages (/<repo>/) comme en local.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { include: ['tests/**/*.test.js'] }, // Vitest : tests unitaires ; Playwright : dossier e2e/
});
