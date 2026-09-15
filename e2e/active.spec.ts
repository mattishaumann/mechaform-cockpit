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
  await page.getByTestId('run-agent').click()
  await expect(page.getByTestId('run-agent')).toBeEnabled({ timeout: 60_000 })
  const row = page.getByTestId('register-contract_guard-0').locator('tbody tr[data-order="508568"][data-article="703947"]')
  await expect(row.getByTestId('status-pill')).toHaveAttribute('data-status', 'open', { timeout: 20_000 })
  await row.click()
  const actions = page.getByTestId('finding-actions')
  await actions.getByRole('button', { name: 'Als gesendet markieren (Simulation)' }).click()
  await expect(actions.getByTestId('status-pill')).toHaveAttribute('data-status', 'sent_simulated')
  await expect(row.getByTestId('status-pill')).toHaveAttribute('data-status', 'sent_simulated', { timeout: 10_000 })
  await page.goto('/')
  await expect(page.getByTestId('activity-feed').locator('li').filter({ hasText: 'marked as sent (simulated)' }).first()).toBeVisible()
})
