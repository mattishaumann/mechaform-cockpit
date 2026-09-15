import { expect, test } from '@playwright/test'

test('C9 agent cards show value, rows and confidence from mvp_cases', async ({ page }) => {
  await page.goto('/')
  const cg = page.getByTestId('agent-card-contract_guard')
  await expect(cg).toContainText('€675,529')
  await expect(cg).toContainText('36 flagged rows')
  await expect(cg).toContainText('Confidence 0.90')
  const tg = page.getByTestId('agent-card-tier_guard')
  await expect(tg).toContainText('€254,503')
  await expect(tg).toContainText('457 flagged rows')
  await expect(tg).toContainText('Confidence 0.75')
})

test('C10 headline sums the enabled agents and exposures stay apart', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('headline')).toContainText('€1,530,724')
  const kept = page.getByTestId('kept-apart')
  await expect(kept).toContainText('Kept apart, not savings')
  await expect(kept).toContainText('€58,477,838')
  await expect(kept).toContainText('€1,079,956')
})

test('C7 no German-format money anywhere on the cockpit', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('headline')).toBeVisible()
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/€\d{1,3}(\.\d{3})+,\d{2}/)
})
