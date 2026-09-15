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

test('I8 cockpit keeps five strategy cards and shows Index Guard as a preview', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-testid^="agent-card-"]')).toHaveCount(5)
  await expect(page.getByTestId('preview-card-index_guard')).toContainText('Sample index data')
  await expect(page.getByTestId('nav-preview-index_guard')).toBeVisible()
})
