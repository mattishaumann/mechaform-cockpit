import { expect, test } from '@playwright/test'

// Run with VITE_RUN_INTERVAL_MS=1500 (see package.json script e2e:c13)
test('C13 last agent run timestamp changes on the configured interval', async ({ page }) => {
  test.skip(process.env.VITE_RUN_INTERVAL_MS !== '1500', 'needs VITE_RUN_INTERVAL_MS=1500')
  await page.goto('/')
  const t = page.getByTestId('last-run')
  const first = await t.getAttribute('datetime')
  await page.waitForTimeout(2000)
  expect(await t.getAttribute('datetime')).not.toBe(first)
})
