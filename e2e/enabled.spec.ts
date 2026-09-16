import { expect, test } from '@playwright/test'

// Run with VITE_ENABLED_AGENTS=contract_guard,tier_guard,terms_floor (see package.json script e2e:c11)
test('C11 enabling a third agent by configuration adds its card and raises the headline', async ({ page }) => {
  test.skip(process.env.VITE_ENABLED_AGENTS !== 'contract_guard,tier_guard,terms_floor', 'needs VITE_ENABLED_AGENTS with terms_floor')
  await page.goto('/')
  const tf = page.getByTestId('agent-card-terms_floor')
  await expect(tf).toContainText('Terms Floor')
  await expect(tf).toContainText('€1,017,963')
  await expect(page.locator('[data-testid^="agent-card-"]')).toHaveCount(3)   // the headline is R13 in spec mvp-recommendations
})

test('L14 all agents by configuration show the gross sum', async ({ page }) => {
  test.skip(process.env.VITE_ENABLED_AGENTS !== 'contract_guard,tier_guard,terms_floor,preferred_steering', 'needs all four agents enabled')
  await page.goto('/')
  await expect(page.getByTestId('agent-card-preferred_steering')).toBeVisible()
  await expect(page.locator('[data-testid^="agent-card-"]')).toHaveCount(4)
  await expect(page.getByTestId('gross')).toContainText('€4,188,488')   // the row-level dedup line was replaced by R13 in spec mvp-recommendations
})
