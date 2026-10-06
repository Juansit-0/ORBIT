import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite build --mode e2e && npx vite preview --port 4173 --strictPort',
    env: { VITE_PLAYER: 'fake' },
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
})
