import { defineConfig } from '@playwright/test'

// PW_PORT lets a second checkout (git worktree) test its own dev server while another one runs on 5173
const port = Number(process.env.PW_PORT ?? 5173)

export default defineConfig({
  testDir: './e2e',
  workers: 1,   // the live tests trigger real agent runs on one shared database; never overlap them
  fullyParallel: false,
  timeout: 30_000,
  use: { baseURL: `http://localhost:${port}`, headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: { command: `npm run dev -- --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: true, timeout: 60_000 },
})
