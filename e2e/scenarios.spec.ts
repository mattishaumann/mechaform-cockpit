import { expect, test } from '@playwright/test'
import { sql } from './db'

// Spec mvp-agent-scenarios S6: Tacto's "Vorgeschlagene Szenarien" in the drawer, above the Empfehlung card.
const PS_2026 = `"case" = 'Preferred Steering' and article_no = 700001 and period_start = '2026-01-01' and period_end = '2026-12-31'`

test('S6 Contract Guard 4602358: agent, chip, four scenarios above the Empfehlung card; the draft scenario opens the draft panel', async ({ page }) => {
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  await page.getByTestId('register-contract_guard-0').locator('tbody tr[data-order="508565"][data-article="703947"]').click()
  const card = page.getByTestId('scenario-card')
  await expect(card.getByTestId('scenario-agent')).toHaveText('Contract Guard')
  await expect(card.getByRole('heading', { name: 'Vorgeschlagene Szenarien' })).toBeVisible()
  await expect(card.getByTestId('scenario-chip')).toHaveText('4602358')
  const rows = card.getByTestId('scenario-row')
  await expect(rows).toHaveCount(4)
  await expect(rows.first().getByTestId('scenario-title')).toContainText('Nachbelastung bei Getriebebau Arnold')
  await expect(rows.first().getByTestId('scenario-benefit')).toContainText('€134,498')
  await expect(rows.last().getByTestId('scenario-benefit')).toContainText('Terms Floor €183,204')
  const [scn, reco] = await Promise.all([card.boundingBox(), page.getByTestId('recommendation-card').boundingBox()])
  expect(scn!.y).toBeLessThan(reco!.y)

  const toggle = rows.first().locator('button[aria-expanded]')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const detail = rows.first().getByTestId('scenario-detail')
  await expect(detail).toContainText('Einkäufer 4471')
  await detail.getByTestId('scenario-action').click()
  await expect(page.getByTestId('draft-panel')).toBeVisible()
})

test('S6 Preferred Steering 700001: Tacto split scenarios; the qualify scenario creates the task the Empfehlung card shows', async ({ page }) => {
  sql(`delete from mvp_tasks where register_id = (select id from mvp_register where ${PS_2026}); update mvp_register set status = 'open' where ${PS_2026}`)
  await page.goto('/agents/preferred_steering?from=2026-01-01&to=2026-12-31')
  await page.getByTestId('register-preferred_steering-0').locator('tbody tr[data-article="700001"]').first().click()
  const card = page.getByTestId('scenario-card')
  await expect(card.getByTestId('scenario-chip')).toHaveText('700001')
  await expect(card.getByTestId('scenario-title').filter({ hasText: 'Aufteilung zwischen Eisengießerei Lausitz und Gießerei Westfalen' })).toHaveCount(2)

  const qualify = card.locator('[data-testid="scenario-row"][data-how="task"]')
  await qualify.locator('button[aria-expanded]').click()
  await qualify.getByTestId('scenario-action').click()
  await expect(qualify.getByTestId('scenario-task-created')).toBeVisible()
  await expect(page.getByTestId('recommendation-card').getByTestId('task-created').first()).toBeVisible()
})
