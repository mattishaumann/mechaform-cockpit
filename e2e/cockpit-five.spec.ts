import { expect, test } from '@playwright/test'
import { sql } from './db'

const AGENTS = ['contract_guard', 'tier_guard', 'terms_floor', 'price_radar', 'preferred_steering']

test.afterEach(() => { sql('update mvp_cases set enabled = true where not enabled') })   // a failed switch test must not leave an agent off

test('R11 five agent cards with summary, on/off switch and open-task counter', async ({ page }) => {
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  await expect(page.locator('[data-testid^="agent-card-"]')).toHaveCount(5)
  for (const key of AGENTS) {
    const card = page.getByTestId(`agent-card-${key}`)
    await expect(card.getByTestId('card-summary')).not.toBeEmpty()
    await expect(card.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    await expect(card.getByTestId('open-tasks')).toContainText(/\d+ open tasks?/)
    await expect(card.getByTestId(`run-detail-${key}`)).toContainText('lines checked')
  }
  await expect(page.getByTestId('agent-card-contract_guard').getByTestId('card-summary')).toContainText('without a contract reference')
})

test('R12 a switched-off agent is muted, logged and left out of "Run all agents"', async ({ page }) => {
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  const card = page.getByTestId('agent-card-price_radar')
  await card.getByRole('switch').click()
  await expect(card).toHaveAttribute('data-enabled', 'false')
  await expect(card.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  await expect(card).toContainText('Off')
  await expect(page.getByTestId('cost-avoidance')).toContainText('Price Radar is switched off')
  await expect(page.getByTestId('activity-feed').locator('li').first()).toContainText('Price Radar: switched off')
  await page.reload()
  await expect(page.getByTestId('agent-card-price_radar')).toHaveAttribute('data-enabled', 'false')   // persisted in the database
  await page.getByTestId('run-all').click()
  await expect(page.getByTestId('run-all')).toBeEnabled({ timeout: 90_000 })
  const log = page.getByTestId('run-log').locator('li')
  await expect(log).toHaveCount(5)
  await expect(log.filter({ hasText: 'Price Radar' })).toHaveCount(0)
  await expect(log.filter({ hasText: 'Contract Guard' })).toHaveCount(1)
  await page.getByTestId('agent-card-price_radar').getByRole('switch').click()
  await expect(page.getByTestId('agent-card-price_radar')).toHaveAttribute('data-enabled', 'true')
})

test('R13 hard savings headline apart from cost avoidance and exposures', async ({ page }) => {
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  await expect(page.getByTestId('hard-savings')).toHaveText('€3,926,438')
  const headline = page.getByTestId('headline')
  for (const v of ['€675,529', '€605,424', '€1,627,521', '€1,017,963']) await expect(headline).toContainText(v)
  await expect(headline).not.toContainText('Price Radar')
  await expect(page.getByTestId('gross')).toContainText('€7,529,667')
  await expect(page.getByTestId('cost-avoidance')).toContainText('€3,341,179')
  await expect(page.getByTestId('cost-avoidance')).toContainText('Kostenvermeidung')
  await expect(page.getByTestId('kept-apart')).toContainText('€58,477,838')
  await expect(page.getByTestId('exposure-reco')).toContainText('NUR INTERN')
})

test('R15 cockpit renders at 375 px without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  await expect(page.getByTestId('hard-savings')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
