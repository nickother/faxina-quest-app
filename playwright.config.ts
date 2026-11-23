import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:4173/faxina-quest-app/',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 }, // iPhone 14
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'off',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/faxina-quest-app/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
