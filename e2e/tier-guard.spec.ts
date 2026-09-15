import { expect, test } from '@playwright/test'

test('C16 Tier Guard shows both layers with totals and page counts', async ({ page }) => {
  await page.goto('/agents/tier_guard')
  const perOrder = page.getByTestId('register-tier_guard-0')
  await expect(perOrder.getByTestId('register-tier_guard-0-total')).toContainText('€254,503')
  await expect(perOrder.getByTestId('register-tier_guard-0-page')).toContainText('Page 1 of 10')
  await expect(perOrder.locator('tbody tr')).toHaveCount(50)
  const annual = page.getByTestId('register-tier_guard-1')
  await expect(annual.getByTestId('register-tier_guard-1-total')).toContainText('€600,692')
  await expect(annual.getByTestId('register-tier_guard-1-page')).toContainText('Page 1 of 2')
})

test('C17 year chart carries the three shares from mvp_stats', async ({ page }) => {
  await page.goto('/agents/tier_guard')
  const chart = page.getByTestId('tier-year-chart')
  await expect(chart).toContainText('19 of 464')
  await expect(chart).toContainText('181 of 508')
  await expect(chart).toContainText('457 of 457')
  await expect(chart).toContainText('100%')
})

test('C18 worked example line is shown', async ({ page }) => {
  await page.goto('/agents/tier_guard')
  await expect(page.locator('main')).toContainText('156 x (€233.41 - €185.74) = €7,437')
})
