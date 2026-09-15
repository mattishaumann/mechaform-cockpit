import { expect, test } from '@playwright/test'

const Y = '?from=2026-01-01&to=2026-12-31'

test('R23 Contract Guard card opens the precomputed Belastungsanzeige citing the contract', async ({ page }) => {
  await page.goto(`/agents/contract_guard${Y}`)
  await page.getByTestId('register-contract_guard-0').locator('tbody tr[data-order="508565"][data-article="703947"]').click()
  await page.getByTestId('recommendation-card').getByRole('button', { name: 'Entwurf erstellen' }).click()
  const panel = page.getByTestId('draft-panel')
  await expect(panel.getByTestId('draft-header')).toHaveText('Entwurf, vor dem Versand prüfen')
  await expect(panel).toContainText('Belastungsanzeige')
  await expect(panel.getByTestId('draft-made-from')).toContainText('Vertrag 4602358')
  const paragraphs = panel.getByLabel('Absatz')
  await expect.poll(async () => (await paragraphs.evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))).join(' '), { timeout: 10_000 }).toContain('4602358')
})

test('R23 Terms Floor card opens the precomputed Konditionenanfrage naming the plant that has the Skonto', async ({ page }) => {
  await page.goto(`/agents/terms_floor${Y}`)
  await page.getByTestId('register-terms_floor-0').locator('tbody tr[data-supplier="3000742"]').click()
  const card = page.getByTestId('recommendation-card')
  await expect(card.getByTestId('rec-external')).toContainText('Konditionenanfrage')
  await card.getByRole('button', { name: 'Entwurf erstellen' }).click()
  const panel = page.getByTestId('draft-panel')
  await expect(panel).toContainText('Konditionenanfrage')
  await expect(panel.getByTestId('draft-made-from')).toContainText(/Erstellt aus 12 Bestellpositionen$/)
  const paragraphs = panel.getByLabel('Absatz')
  await expect.poll(async () => (await paragraphs.evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))).join(' '), { timeout: 10_000 }).toContain('Chemnitz')
  await expect(panel.getByTestId('draft-numbers')).toContainText('detail.best_rate')
})
