// Screenshots for the design pass: node scripts/shot.mjs <url> <outPrefix>
import { chromium } from '@playwright/test'
const [url = 'http://localhost:5174/', out = '/tmp/shot'] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto(url); await p.waitForSelector('main h1')
await p.waitForTimeout(1500)
await p.screenshot({ path: `${out}-1280.png`, fullPage: true })
await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(300)
await p.screenshot({ path: `${out}-375.png`, fullPage: true })
await b.close()
