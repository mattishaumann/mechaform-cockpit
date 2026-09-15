import { expect, test } from '@playwright/test'

test('C19 empty state when no agent is enabled', async ({ page }) => {
  test.skip(process.env.VITE_ENABLED_AGENTS !== '', 'needs VITE_ENABLED_AGENTS set to an empty string')
  await page.goto('/')
  await expect(page.getByTestId('empty-state')).toContainText('No agents enabled')
})

test('C19 error state when the database URL is wrong', async ({ page }) => {
  test.skip(process.env.VITE_SUPABASE_URL !== 'https://invalid.example', 'needs an invalid VITE_SUPABASE_URL')
  await page.goto('/')
  await expect(page.getByTestId('error-state')).toContainText('did not answer', { timeout: 20_000 })
})
