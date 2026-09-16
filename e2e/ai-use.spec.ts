import { expect, test } from '@playwright/test'

// Where the MVP uses a language model: three surfaces with a model, the rest on rules, reachable from the navigation.
test('AI1 the page names the three model surfaces and what uses no model', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-ai').click()
  await expect(page).toHaveURL(/\/ai/)
  const rows = page.getByTestId('ai-surface')
  await expect(rows).toHaveCount(3)
  await expect(page.locator('[data-surface="drafts"]')).toContainText('Nothing is sent')
  await expect(page.locator('[data-surface="trainer"]')).toContainText('canary')
  await expect(page.locator('[data-surface="benchmark"]')).toContainText('Not live')
  await expect(page.getByTestId('ai-no-model')).toContainText('Contract Guard, Tier Guard and Terms Floor')
  await expect(page.getByTestId('ai-no-model')).toContainText('Index Guard')
  await expect(page.getByTestId('ai-common')).toContainText('Claude Haiku 4.5')
})
