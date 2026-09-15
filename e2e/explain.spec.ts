import { expect, test } from '@playwright/test'

test('C12 explain control opens the rule, evidence, calculation and action from mvp_cases', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Explain Contract Guard' }).click()
  const panel = page.getByTestId('agent-explain-contract_guard')
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('Attach the agreement')
  await expect(panel).toContainText('Regime A')
  await expect(page.getByTestId('agent-card-contract_guard')).toContainText('human judgement')
})
