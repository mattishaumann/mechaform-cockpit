import { expect, test } from '@playwright/test'

test('R9 register filtered by Finanzen shows only Terms Floor findings, 430 in 2026', async ({ page }) => {
  await page.goto('/register?from=2026-01-01&to=2026-12-31')
  await page.getByTestId('role-filter-Finanzen').click()
  await expect(page).toHaveURL(/role=Finanzen/)
  await expect(page.getByTestId('role-filter-Finanzen')).toHaveAttribute('aria-pressed', 'true')
  const table = page.getByTestId('register-all')
  await expect(table.locator('tfoot')).toContainText('430 flagged rows')
  await expect(table.getByTestId('register-all-total')).toContainText('€1,017,963')
  const agents = await table.locator('tbody tr td:first-child').allInnerTexts()
  expect(agents.length).toBe(50)
  expect(new Set(agents)).toEqual(new Set(['Terms Floor']))
  await page.getByTestId('role-filter-all').click()
  await expect(table.locator('tfoot')).not.toContainText('430 flagged rows')
})
