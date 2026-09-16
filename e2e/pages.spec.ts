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

for (const key of ['contract_guard', 'tier_guard', 'terms_floor']) {
  test(`R21 ${key}: a row opens the drawer with evidence and the card`, async ({ page }) => {
    await page.goto(`/agents/${key}${Y}`)
    const drawer = await openFirstRow(page, key)
    if (key === 'terms_floor') await expect(drawer.locator('[data-testid="evidence-row"][data-marked]').first()).toBeVisible()
  })
}
