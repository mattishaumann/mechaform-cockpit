import { expect, test } from '@playwright/test'

test('C14 Contract Guard register lists every flagged row with the total', async ({ page }) => {
  await page.goto('/agents/contract_guard')
  const table = page.getByTestId('register-contract_guard-0')
  await expect(table.getByTestId('register-contract_guard-0-total')).toContainText('€675,529')
  await expect(table.locator('tbody tr')).toHaveCount(36)
  await expect(table.locator('thead')).toContainText('Contract price')
})

test('C15 evidence drawer shows all 12 order lines with both prices', async ({ page }) => {
  await page.goto('/agents/contract_guard')
  await page.getByTestId('register-contract_guard-0').locator('tbody tr[data-order="508565"]').click()
  const drawer = page.getByTestId('evidence-drawer')
  await expect(drawer.getByTestId('evidence-row')).toHaveCount(12)
  await expect(drawer).toContainText('€866.70')
  await expect(drawer).toContainText('€1,038.91')
  await expect(drawer.getByText('No reference')).toHaveCount(4)
})
