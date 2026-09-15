import { expect, test, type Page } from '@playwright/test'

const Y = '?from=2026-01-01&to=2026-12-31'

async function openFirstRow(page: Page, key: string) {
  const table = page.getByTestId(`register-${key}-0`)
  await table.locator('tbody tr').first().click()
  const drawer = page.getByTestId('evidence-drawer')
  await expect(drawer.getByTestId('recommendation-card')).toBeVisible()
  await expect(drawer.getByTestId('evidence-row').first()).toBeVisible({ timeout: 10_000 })
  await expect(drawer.getByTestId('drawer-title')).not.toBeEmpty()
  return drawer
}

test('R16 Contract Guard: contract table with seven contracts replaces the trend chart', async ({ page }) => {
  await page.goto(`/agents/contract_guard${Y}`)
  const t = page.getByTestId('contract-table')
  await expect(t.locator('tbody tr')).toHaveCount(7)
  await expect(t.locator('tbody tr[data-contract="4602358"]')).toContainText('€134,498')
  await expect(t.getByTestId('contract-table-total')).toHaveText('€675,529')
  await expect(page.getByTestId('trend-chart')).toHaveCount(0)
})

test('R17 Tier Guard: the column chart is the page chart', async ({ page }) => {
  await page.goto(`/agents/tier_guard${Y}`)
  await expect(page.getByTestId('agent-chart').getByTestId('tier-year-chart')).toContainText('457 of 457')
  await expect(page.getByTestId('trend-chart')).toHaveCount(0)
})

test('R18 Terms Floor: bridge from Skonto gained to net gain', async ({ page }) => {
  await page.goto(`/agents/terms_floor${Y}`)
  const b = page.getByTestId('terms-bridge')
  await expect(b.locator('[data-step="gross"]')).toContainText('€1,290,437')
  await expect(b.locator('[data-step="financing"]')).toContainText('€272,474')
  await expect(b.locator('[data-step="net"]')).toContainText('€1,017,963')
})

test('R19 Price Radar: indexed line against the assumed path, labelled Annahme', async ({ page }) => {
  await page.goto(`/agents/price_radar${Y}`)
  const c = page.getByTestId('price-index-chart')
  for (const y of ['2024', '2025', '2026']) await expect(c.getByTestId('price-index-table')).toContainText(y)
  await expect(c).toContainText('Annahme')
  await expect(c).toContainText('Kostenvermeidung')
  await expect(c.getByTestId('price-index-table')).toContainText('108.7')
})

test('R20 Preferred Steering: comparison cards, largest gap first', async ({ page }) => {
  await page.goto(`/agents/preferred_steering${Y}`)
  const first = page.getByTestId('comparison-card').first()
  await expect(page.getByTestId('comparison-card')).toHaveCount(3)
  await expect(first).toContainText('€107.30')
  await expect(first).toContainText('€98.81')
  await expect(first).toContainText('7.9% günstiger')
  await first.click()
  await expect(page.getByTestId('evidence-drawer').getByTestId('recommendation-card')).toContainText('NUR INTERN')
})

for (const key of ['contract_guard', 'tier_guard', 'terms_floor', 'price_radar', 'preferred_steering']) {
  test(`R21 ${key}: a row opens the drawer with evidence and the card`, async ({ page }) => {
    await page.goto(`/agents/${key}${Y}`)
    const drawer = await openFirstRow(page, key)
    if (key === 'terms_floor') await expect(drawer.locator('[data-testid="evidence-row"][data-marked]').first()).toBeVisible()
  })
}
