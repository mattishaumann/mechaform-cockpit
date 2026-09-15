import { expect, test } from '@playwright/test'

test('A7 agent card shows run detail with lines checked and findings', async ({ page }) => {
  await page.goto('/')
  const d = page.getByTestId('run-detail-contract_guard')
  await expect(d).toContainText('10,955 lines checked')
  await expect(d).toContainText('36 flagged')
})

test('A9 activity feed shows the latest ten events, newest first', async ({ page }) => {
  await page.goto('/')
  const items = page.getByTestId('activity-feed').locator('li')
  await expect(items.first()).toBeVisible()
  const n = await items.count()
  expect(n).toBeGreaterThan(0)
  expect(n).toBeLessThanOrEqual(10)
  const times = await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-time') ?? ''))
  expect(times[0] >= times[times.length - 1]).toBe(true)
})

test('A10 status pill changes on simulated send and a feed entry appears', async ({ page }) => {
  // own period so concurrent tests that re-run the 2026 agents cannot replace the rows under this test
  await page.goto('/agents/contract_guard?from=2026-04-01&to=2026-06-30')
  const table = page.getByTestId('register-contract_guard-0')
  await expect(table).toBeVisible()
  const previousRun = await table.getAttribute('data-run-id')
  await page.getByTestId('run-agent').click()
  await expect(page.getByTestId('run-agent')).toBeEnabled({ timeout: 60_000 })
  // the register must show the fresh run's rows (new ids) before a row is opened
  await expect(table).not.toHaveAttribute('data-run-id', previousRun ?? '', { timeout: 20_000 })
  const row = table.locator('tbody tr[data-order="508568"][data-article="703947"]')
  await expect(row.getByTestId('status-pill')).toBeVisible({ timeout: 20_000 })
  await row.click()
  const actions = page.getByTestId('finding-actions')
  // statuses survive re-runs since active_carry.sql, so a previous run of this test leaves the row marked as sent: reopen it first
  if ((await row.getByTestId('status-pill').getAttribute('data-status')) !== 'open') {
    await actions.getByRole('button', { name: 'Wieder öffnen' }).click()
    await expect(actions.getByTestId('status-pill')).toHaveAttribute('data-status', 'open')
  }
  await expect(row.getByTestId('status-pill')).toHaveAttribute('data-status', 'open', { timeout: 10_000 })
  await actions.getByRole('button', { name: 'Als gesendet markieren (Simulation)' }).click()
  await expect(actions.getByTestId('status-pill')).toHaveAttribute('data-status', 'sent_simulated')
  await expect(row.getByTestId('status-pill')).toHaveAttribute('data-status', 'sent_simulated', { timeout: 10_000 })
  await page.goto('/')
  await expect(page.getByTestId('activity-feed').locator('li').filter({ hasText: 'marked as sent (simulated)' }).first()).toBeVisible()
})

test('A11 draft panel shows a precomputed Contract Guard draft with header lines, subject, number chips and hover highlight', async ({ page }) => {
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  const row = page.getByTestId('register-contract_guard-0').locator('tbody tr[data-order="508565"][data-article="703947"]')
  await row.click()
  const panel = page.getByTestId('draft-panel')
  await expect(panel.getByTestId('draft-header')).toHaveText('Entwurf, vor dem Versand prüfen')
  await expect(panel.getByTestId('draft-made-from')).toContainText(/Erstellt aus \d+ Bestellpositionen und Vertrag 4602358/)
  await expect(panel.getByTestId('draft-numbers-line')).toHaveText('Alle Zahlen stammen aus Ihren Bestelldaten. Keine neuen Zahlen hinzugefügt.')
  await expect(panel.getByTestId('draft-subject')).toContainText('Betreff')
  await expect(panel.getByTestId('draft-subject')).not.toHaveText(/Betreff\s*$/)
  const chips = panel.getByTestId('draft-numbers').locator('li')
  await expect(chips.first()).toBeVisible()
  await expect(panel.getByTestId('draft-numbers')).toContainText('case.contract_no')
  // the typewriter reveal takes about 1.5 s; wait for the paragraph that cites the order
  const paragraphs = panel.getByLabel('Absatz')
  await expect.poll(async () => (await paragraphs.evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))).some((v) => v.includes('508565')), { timeout: 10_000 }).toBe(true)
  const values = await paragraphs.evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))
  await paragraphs.nth(values.findIndex((v) => v.includes('508565'))).hover()
  await expect(panel.locator('[data-testid="draft-evidence-row"][data-highlight]')).not.toHaveCount(0)
  await expect(panel.locator('[data-testid="draft-evidence-row"][data-highlight]').first()).toContainText('508565')
})
