import { expect, test } from '@playwright/test'

test('L8 period selector writes the range to the URL', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Period').selectOption('Q1 2026')
  await expect(page).toHaveURL(/from=2026-01-01&to=2026-03-31/)
})

test('L9 run all agents records runs and keeps the 2026 headline', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('run-all').click()
  await expect(page.getByTestId('run-all')).toBeEnabled({ timeout: 90_000 })
  await expect(page.getByTestId('run-log').locator('li[data-status="done"]')).toHaveCount(5, { timeout: 20_000 })   // the log lists the last five runs
  await expect(page.getByTestId('hard-savings')).toHaveText('€3,926,438')   // hard-savings headline since spec mvp-recommendations R13
  await expect(page.getByTestId('last-run')).not.toContainText('Not run')
})

test('L10 findings follow the period after a run', async ({ page }) => {
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-03-31')
  await page.getByTestId('run-agent').click()
  await expect(page.getByTestId('run-agent')).toBeEnabled({ timeout: 60_000 })
  const t = page.getByTestId('register-contract_guard-0')
  await expect(t.locator('tbody tr')).toHaveCount(9, { timeout: 20_000 })
  await expect(t.getByTestId('register-contract_guard-0-total')).toContainText('€173,134')
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  await page.getByTestId('run-agent').click()
  await expect(page.getByTestId('run-agent')).toBeEnabled({ timeout: 60_000 })
  const t2 = page.getByTestId('register-contract_guard-0')
  await expect(t2.locator('tbody tr')).toHaveCount(36, { timeout: 20_000 })
  await expect(t2.getByTestId('register-contract_guard-0-total')).toContainText('€675,529')
})

test('L11 findings of a fresh run arrive through the live subscription without a reload', async ({ page }) => {
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  const table = page.getByTestId('register-contract_guard-0')
  await expect(table).toBeVisible()
  const before = await table.getAttribute('data-run-id')
  await page.evaluate(() => { (window as unknown as { __alive: number }).__alive = 1 })
  await page.getByTestId('run-agent').click()
  await expect(table).not.toHaveAttribute('data-run-id', before ?? '', { timeout: 15_000 })
  await expect(table.locator('tbody tr')).toHaveCount(36, { timeout: 15_000 })
  expect(await page.evaluate(() => (window as unknown as { __alive?: number }).__alive)).toBe(1)
})

test('L12 trend chart shows twelve months and the run total', async ({ page }) => {
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  const chart = page.getByTestId('trend-chart')
  await expect(chart.getByTestId('trend-total')).toContainText('€675,529')
  for (const m of ['Jan 26', 'Jun 26', 'Dec 26']) await expect(chart).toContainText(m)
  await expect(chart.locator('.recharts-xAxis .recharts-cartesian-axis-tick')).toHaveCount(12)
})

test('L13 dashboard order and fold-out explanation', async ({ page }) => {
  await page.goto('/agents/contract_guard?from=2026-01-01&to=2026-12-31')
  await expect(page.getByTestId('how-panel')).toHaveCount(0)
  await expect(page.getByTestId('run-agent')).toBeVisible()
  await expect(page.getByTestId('kpi-gap')).toContainText('€675,529')
  await expect(page.getByTestId('trend-chart')).toBeVisible()
  await page.getByRole('button', { name: 'How this agent works' }).click()
  await expect(page.getByTestId('how-panel')).toContainText('Attach the agreement')
  await expect(page.getByTestId('register-contract_guard-0')).toBeVisible({ timeout: 20_000 })   // the register loads last; measure only once it is there
  const order = await page.evaluate(() => ['run-agent', 'kpi-gap', 'trend-chart', 'register-contract_guard-0'].map((id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().top ?? -1))
  expect(order).toEqual([...order].sort((a, b) => a - b))
})
