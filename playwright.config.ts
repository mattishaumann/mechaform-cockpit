import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,   // the live tests trigger real agent runs on one shared database; never overlap them
  fullyParallel: false,
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173', headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  // a run that overrides the app's environment must get its own server: a reused one would silently test the default configuration
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: process.env.VITE_ENABLED_AGENTS === undefined && process.env.VITE_SUPABASE_URL === undefined, timeout: 60_000 },
})
