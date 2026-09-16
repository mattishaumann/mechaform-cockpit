import { expect, test } from '@playwright/test'
import { sql, sqlRows } from './db'

// Price Radar was cancelled on 2026-09-16 (spec mvp-recommendations, Price Radar cancelled): four agents on the cockpit
const AGENTS = ['contract_guard', 'tier_guard', 'terms_floor']

// a failed switch test must not leave one of its agents off; other agents (Index Guard preview) keep their own switch
test.afterEach(() => { sql(`update mvp_cases set enabled = true where not enabled and case_key in (${AGENTS.map((a) => `'${a}'`).join(', ')})`) })

test('R11 three agent cards with summary, on/off switch and open-task counter', async ({ page }) => {
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  await expect(page.locator('[data-testid^="agent-card-"]')).toHaveCount(3)
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
  const card = page.getByTestId('agent-card-terms_floor')
  await card.getByRole('switch').click()
  await expect(card).toHaveAttribute('data-enabled', 'false')
  await expect(card.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  await expect(card).toContainText('Off')
  await expect(page.getByTestId('activity-feed').locator('li').first()).toContainText('Terms Floor: switched off')
  await page.reload()
  await expect(page.getByTestId('agent-card-terms_floor')).toHaveAttribute('data-enabled', 'false')   // persisted in the database
  // other sessions run agents on the same database, so ask the database what this click started, not the shared run log
  const t0 = String(sqlRows('select now() as t')[0].t)
  await page.getByTestId('run-all').click()
  await expect(page.getByTestId('run-all')).toBeEnabled({ timeout: 90_000 })
  const started = sqlRows(`select agent, count(*) as n from agent_runs where started_at > '${t0}' group by agent`)
  const byAgent = Object.fromEntries(started.map((r) => [r.agent, Number(r.n)]))
  expect(byAgent.terms_floor ?? 0).toBe(0)
  expect(byAgent.contract_guard ?? 0).toBeGreaterThan(0)
  await page.getByTestId('agent-card-terms_floor').getByRole('switch').click()
  await expect(page.getByTestId('agent-card-terms_floor')).toHaveAttribute('data-enabled', 'true')
})

test('R13 hard savings headline apart from cost avoidance and exposures', async ({ page }) => {
  await page.goto('/?from=2026-01-01&to=2026-12-31')
  await expect(page.getByTestId('hard-savings')).toHaveText('€2,298,917')
  const headline = page.getByTestId('headline')
  for (const v of ['€675,529', '€605,424', '€1,017,963']) await expect(headline).toContainText(v)
  await expect(headline).not.toContainText('Price Radar')
  await expect(page.getByTestId('gross')).toContainText('€2,548,687')
  await expect(page.getByTestId('cost-avoidance')).toHaveCount(0)   // no cost-avoidance case since Price Radar was cancelled
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
