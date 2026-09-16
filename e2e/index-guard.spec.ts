import { expect, test } from '@playwright/test'

// Spec mvp-index-guard I7, I8: the preview agent's page and its place in the cockpit.
test('I7 Index Guard page: sample banner, category chart, basket, both layers after a run', async ({ page }) => {
  await page.goto('/agents/index_guard?from=2026-01-01&to=2026-12-31')
  await expect(page.getByTestId('index-sample-banner')).toContainText('generated for the MVP')
  await expect(page.getByTestId('index-sample-banner')).toContainText('need tuning')
  await page.getByTestId('run-agent').click()
  await expect(page.getByTestId('run-agent')).toBeEnabled({ timeout: 90_000 })
  await expect(page.getByTestId('index-guard-chart')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('index-cat-1000').click()
  await expect(page.getByTestId('index-basket-table')).toContainText('Foundry pig iron and scrap')
  await expect(page.getByTestId('index-basket-table')).toContainText('Fixed share')
  const orders = page.getByTestId('register-index_guard-0')
  await expect(orders.locator('tbody tr[data-article="700001"]').first()).toBeVisible({ timeout: 20_000 })
  const contracts = page.getByTestId('register-index_guard-1')
  await expect(contracts.locator('tbody tr').first()).toBeVisible()
  await contracts.locator('tbody tr').first().click()
  await expect(page.getByTestId('evidence-drawer')).toBeVisible()
})

test('I8 cockpit keeps Index Guard out of the strategy cards and shows it as a preview', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('agent-card-index_guard')).toHaveCount(0)   // a preview, never a strategy card
  await expect(page.getByTestId('preview-card-index_guard')).toContainText('Sample index data')
  await expect(page.getByTestId('nav-preview-index_guard')).toBeVisible()
  await expect(page.locator('[data-testid="agent-card-index_guard"]')).toHaveCount(0)   // the card count itself is R11's assertion
})

// Spec mvp-index-guard I12, I13: the takeaway. Action items first, then the verdict for the category in the chart.
test('I12 recommendations name the suppliers furthest above the index, with evidence and the trainer', async ({ page }) => {
  await page.goto('/agents/index_guard?from=2026-01-01&to=2026-12-31')
  await page.getByTestId('run-agent').click()
  await expect(page.getByTestId('run-agent')).toBeEnabled({ timeout: 90_000 })
  const items = page.getByTestId('index-action')
  await expect(items).toHaveCount(3, { timeout: 20_000 })
  await expect(items.first()).toContainText('Preise mit Eisengießerei Lausitz')
  await expect(items.first()).toContainText('über dem Indexpreis')
  await expect(items.first()).toContainText('Vertrag 4600001')
  await expect(items.first().getByTestId('index-train')).toHaveAttribute('href', '/trainer')
  await expect(page.getByTestId('index-action-rest')).toContainText('Weitere')
  await items.first().getByRole('button', { name: 'Beleg öffnen' }).click()
  await expect(page.getByTestId('evidence-drawer')).toBeVisible()
})

test('I13 category verdict: negotiate for castings, watch below the tolerance', async ({ page }) => {
  await page.goto('/agents/index_guard?from=2026-01-01&to=2026-12-31')
  const verdict = page.getByTestId('index-verdict')
  await expect(verdict).toHaveAttribute('data-verdict', 'negotiate', { timeout: 20_000 })
  await expect(verdict).toContainText('Verhandlung empfohlen')
  await expect(verdict).toContainText('über dem Kostenkorb')
  await page.getByTestId('index-cat-1009').click()
  await expect(verdict).toHaveAttribute('data-verdict', 'watch')
  await expect(verdict).toContainText('unter der Toleranz')
})

test('I14 preview strip carries the non-agent preview pages too', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('preview-card-trainer')).toContainText('Negotiation trainer')
  await page.getByTestId('preview-card-trainer').getByRole('link', { name: 'Open' }).click()
  await expect(page).toHaveURL(/\/trainer/)
})
