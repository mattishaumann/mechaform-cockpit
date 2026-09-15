import { expect, test } from '@playwright/test'
import { sql } from './db'

const CG_2026 = `"case" = 'Contract Guard' and order_no = 508565 and article_no = 703947 and period_start = '2026-01-01' and period_end = '2026-12-31'`

test('R8 Contract Guard card: rationale, ERST INTERN, task moves the finding to IN BEARBEITUNG, feed entry', async ({ page }) => {
  sql(`delete from mvp_tasks where register_id = (select id from mvp_register where ${CG_2026}); update mvp_register set status = 'draft_ready' where ${CG_2026}`)
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  const row = page.getByTestId('register-contract_guard-0').locator('tbody tr[data-order="508565"][data-article="703947"]')
  await expect(row.getByTestId('sequence-pill')).toHaveAttribute('data-sequence', 'internal_first')
  await row.click()
  const card = page.getByTestId('recommendation-card')
  await expect(card.getByTestId('rec-title')).toHaveText('Contract Guard empfiehlt Nachbelastung')   // R25
  await expect(card.getByTestId('rec-rationale')).toContainText('Vertrag 4602358')
  await expect(card.getByTestId('rec-rationale')).toContainText('€38,403')
  await expect(card.getByTestId('sequence-pill')).toContainText('ERST INTERN')
  const buyer = card.getByTestId('rec-internal').filter({ hasText: 'Einkäufer 4471' })
  await buyer.getByRole('button', { name: 'Aufgabe anlegen' }).click()
  await expect(buyer.getByTestId('task-created')).toContainText(/Aufgabe angelegt, fällig \d{4}-\d{2}-\d{2}/)
  const actions = page.getByTestId('finding-actions')
  await expect(actions.getByTestId('status-pill')).toHaveAttribute('data-status', 'in_progress')
  await expect(actions).toContainText('IN BEARBEITUNG')
  const external = card.getByTestId('rec-external')
  await expect(external).toContainText('Getriebebau Arnold GmbH')
  await expect(external).toContainText('Belastungsanzeige')
  await expect(external.getByRole('button', { name: 'Entwurf erstellen' })).toBeVisible()
  await expect(external).toContainText('Entwurf, vor dem Versand prüfen')
  await page.goto('/')
  await expect(page.getByTestId('activity-feed').locator('li').filter({ hasText: 'task for Einkäufer 4471' }).first()).toBeVisible()
})

test('R8 Price Radar card is internal only: NUR INTERN and no external block', async ({ page }) => {
  await page.goto('/agents/price_radar?from=2026-01-01&to=2026-12-31')
  const row = page.getByTestId('register-price_radar-0').locator('tbody tr[data-article="700001"]')
  await expect(row.getByTestId('sequence-pill')).toHaveAttribute('data-sequence', 'internal_only')
  await row.click()
  const card = page.getByTestId('recommendation-card')
  await expect(card.getByTestId('rec-title')).toHaveText('Price Radar empfiehlt Verhandlungsvorbereitung')   // R25
  await expect(card.getByTestId('sequence-pill')).toContainText('NUR INTERN')
  await expect(card.getByTestId('rec-internal').first()).toContainText('Kategorieeinkauf')
  await expect(card.getByTestId('rec-rationale')).toContainText('Annahme')
  await expect(card.getByTestId('rec-external')).toHaveCount(0)
})

test('R26 Contract Guard names the contract owner as the responsible buyer', async ({ page }) => {
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  await page.getByTestId('register-contract_guard-0').locator('tbody tr[data-order="508565"][data-article="703947"]').click()
  const buyer = page.getByTestId('recommendation-card').getByTestId('rec-internal').filter({ hasText: 'Einkäufer 4471' })
  await expect(buyer).toContainText('Vertragsverantwortlich')
  await expect(buyer).toContainText('Verantwortet Vertrag 4602358 selbst und hat ohne Vertragsbezug bestellt')
})
