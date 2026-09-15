import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:5174/agents/contract_guard'); await p.waitForSelector('tbody tr'); await p.waitForTimeout(800)
await p.screenshot({ path: '/tmp/cg-1280.png', fullPage: true })
await p.locator('tbody tr[data-order="508565"][data-article="703947"]').click(); await p.waitForSelector('[data-testid=evidence-row]'); await p.waitForTimeout(500)
await p.screenshot({ path: '/tmp/cg-drawer.png' })
await b.close()
