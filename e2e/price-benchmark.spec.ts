import { expect, test } from '@playwright/test'

// Spec mvp-price-benchmark P5 to P7: the flagship's page, its method, and its place in the cockpit.
const PAGE = '/agents/price_benchmark?from=2026-01-01&to=2026-12-31'

test('P5 scan results: recommendation, savings and next step per card, details folded away', async ({ page }) => {
  await page.goto(PAGE)
  await expect(page.getByTestId('benchmark-dev-banner')).toContainText('very much in development')
  const head = page.getByTestId('benchmark-headline')
  await expect(head).toContainText('In development')
  await expect(head).toContainText('Moonshot')
  await expect(head.getByTestId('benchmark-confidence')).toContainText('Low confidence')
  await expect(page.getByTestId('benchmark-range')).toHaveText(/Potential savings:\s*€1\.8M – €3\.0M \/ year\s*\(sample of 4 articles\)/)
  await expect(page.getByTestId('benchmark-disclaimer')).toContainText('Indicative only. Verify before taking action.')
  await expect(page.getByRole('button', { name: 'Run scan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Scan results' })).toBeVisible()
  await expect(page.getByTestId('benchmark-scan-sub')).toContainText('4 of 5,077 articles matched in this run')

  const cards = page.getByTestId('benchmark-card')
  await expect(cards).toHaveCount(4)
  expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-article')))).toEqual(['710121', '707922', '712692', '712690'])

  const box = cards.first()
  await expect(box.getByTestId('benchmark-case')).toContainText('Change supplier')
  await expect(box.getByTestId('benchmark-reco')).toContainText('Re-source Faltkarton: comparable parts go for about €3.00, MechaForm pays €15.96')
  await expect(box.getByTestId('benchmark-savings')).toHaveText(/€1,20\d,\d{3} – €1,96\d,\d{3}/)
  await expect(box.getByTestId('benchmark-web')).toContainText('1.20–1.71')
  await expect(box.getByTestId('benchmark-source')).toHaveAttribute('href', 'https://www.mypack.de/faltkarton-500x300x300-mm-2-wellig')
  await expect(box.getByTestId('benchmark-gap')).toContainText('81% above')
  await expect(box.getByTestId('benchmark-next')).toContainText('Check the spec: ask Verpackung Karton & Holz for the drawing')
  // evidence and the full path are folded until asked for
  await expect(box.getByTestId('benchmark-part')).toBeHidden()
  await box.getByTestId('benchmark-evidence').getByRole('group').or(box.getByTestId('benchmark-evidence').locator('summary')).first().click()
  await expect(box.getByTestId('benchmark-part')).toContainText('FEFCO 0201')
  await expect(box.getByTestId('benchmark-supplier').first()).toContainText('Verpackung Karton & Holz GmbH')
  await box.getByTestId('benchmark-path').locator('summary').click()
  await expect(box.getByTestId('benchmark-actions').locator('li')).toHaveCount(5)

  const confirmed = cards.last()
  await expect(confirmed.getByTestId('benchmark-case')).toContainText('Price confirmed')
  await expect(confirmed.getByTestId('benchmark-reco')).toContainText('Keep the supplier')
  await expect(confirmed.getByTestId('benchmark-savings')).toHaveText('No savings case, the price is confirmed')
  await expect(confirmed.getByTestId('benchmark-gap')).toContainText('list price')
  await expect(cards.nth(2).getByTestId('benchmark-case')).toContainText('Brand substitution')
})

test('P6 method folds open: four steps, today (sample) against at scale', async ({ page }) => {
  await page.goto(PAGE)
  const method = page.getByTestId('benchmark-method')
  await expect(method.getByTestId('benchmark-step')).toBeHidden()
  await method.locator('summary').click()
  const steps = method.getByTestId('benchmark-step')
  await expect(steps).toHaveCount(4)
  await expect(steps.nth(0)).toContainText('An LLM guessed the manufacturer part number')
  await expect(steps.nth(0)).toContainText('A classifier trained on confirmed matches')
  await expect(steps.nth(1)).toContainText('listed the suppliers with links')
  await expect(steps.nth(3)).toContainText('RFQ')
})

test('P7 cockpit: the benchmark sits in the preview strip and never moves the headline', async ({ page }) => {
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  const headline = page.getByTestId('hard-savings')
  const before = await headline.textContent()
  expect(before).toMatch(/^€[\d,]+$/)
  await expect(page.getByTestId('benchmark-note')).toContainText('potentially a lot')
  await expect(page.getByTestId('benchmark-note')).toContainText('Not counted')
  const card = page.getByTestId('preview-card-price_benchmark')
  await expect(card).toContainText('Low confidence')
  await expect(card.getByTestId('preview-value')).toContainText('€1.8M – €3.0M / year, not in any total')
  await expect(page.getByTestId('agent-card-price_benchmark')).toHaveCount(0)   // never a strategy card
  await expect(page.getByTestId('nav-preview-price_benchmark')).toBeVisible()

  await page.goto(PAGE)
  await page.getByTestId('run-agent').click()
  await expect(page.getByTestId('run-agent')).toBeEnabled({ timeout: 60_000 })
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  await expect(headline).toHaveText(before!)   // the scan counts in no total
  const log = page.getByTestId('run-log')
  await expect(log.locator('li', { hasText: 'External Price Benchmark' }).first()).toContainText('Range, low confidence', { timeout: 15_000 })
})
