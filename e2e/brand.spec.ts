import { expect, test } from '@playwright/test'

test('C6 header carries the Tacto spark and wordmark', async ({ page }) => {
  await page.goto('/')
  const brand = page.getByTestId('brand')
  await expect(brand.locator('svg')).toBeVisible()
  await expect(brand).toContainText('tacto')
})
