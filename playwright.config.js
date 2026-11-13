import { defineConfig, devices } from '@playwright/test';

/**
 * Parcours réels dans un vrai navigateur (Chromium), en format téléphone.
 * `npm run test:e2e` compile l'app, la sert en local, puis rejoue les parcours.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'off' },
  projects: [
    { name: 'iPhone 13', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'iPhone SE', use: { ...devices['iPhone SE'], browserName: 'chromium' } },
  ],
  // Toujours l'app fraîchement construite : jamais un serveur oublié qui servirait une vieille version.
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: false, timeout: 120_000 },
});
