import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'https://mechaform-cockpit.vercel.app'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto(url + '/'); await p.waitForSelector('[data-testid=headline]', { timeout: 20000 })
const headline = await p.getByTestId('headline').innerText()
const brand = await p.getByTestId('brand').innerText()
await p.goto(url + '/agents/contract_guard?from=2026-01-01&to=2026-12-31'); await p.waitForSelector('tbody tr', { timeout: 20000 })
const rows = await p.locator('tbody tr').count()
console.log(JSON.stringify({ brand, headline: headline.split('\n')[1], contractGuardRows: rows }))
await p.screenshot({ path: '/tmp/prod-cg.png' })
await b.close()
