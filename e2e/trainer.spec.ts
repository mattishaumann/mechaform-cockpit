import { expect, test } from '@playwright/test'

test('T5 trainer: Preview pill, three roadmap stages, the brief, five stored turns stepped without calling the model', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (r) => { if (r.url().includes('/functions/v1/trainer-turn')) calls.push(r.url()) })
  await page.goto('/trainer')
  await expect(page.getByTestId('preview-pill')).toHaveText('Preview')
  await expect(page.getByTestId('roadmap-stage')).toHaveCount(3)
  await expect(page.getByTestId('roadmap-stage').first()).toContainText('Stored practice session and one live turn')
  const brief = page.getByTestId('brief-panel')
  await expect(brief).toContainText('€412,387')
  await expect(brief).toContainText('€183,204')
  await expect(page.getByTestId('replay-hint')).toBeVisible()
  for (let i = 1; i <= 5; i++) {
    await page.getByTestId('next-turn').click()
    await expect(page.getByTestId('coach-card')).toHaveCount(i)
  }
  await expect(page.getByTestId('next-turn')).toHaveCount(0)
  await expect(page.getByTestId('turn').first().getByTestId('supplier-reply')).toContainText('Getriebebau Arnold GmbH, key account manager')
  await expect(page.getByTestId('live-form')).toBeVisible()
  expect(calls).toHaveLength(0)
})

const cannedTurn = { id: 1, session_id: 424242, turn_no: 6, buyer: 'Our Hamburg payment run can settle within the Skonto period.',
  supplier: { message: 'Then 3% applies from the next order, with the renewal signed.', concession: 'partial', numbers_used: [] },
  coach: { assessment: 'ok', note: 'You answered the working-capital argument. Anchor on the total next.', next_fact_id: 'contract_guard', used_fact_ids: ['terms_floor'] } }

test('T6 one live turn (answer routed, no spend): reply and coach card appear, the form locks, Start over reopens it', async ({ page }) => {
  await page.route('**/rest/v1/rpc/start_live_session', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '424242' }))
  await page.route('**/functions/v1/trainer-turn', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turn: cannedTurn }) }))
  await page.goto('/trainer')
  await page.getByRole('button', { name: 'Show all turns' }).click()
  const box = page.getByTestId('live-form').getByLabel('Your next message')
  await expect(page.getByTestId('live-form').getByRole('button', { name: 'Send' })).toBeDisabled()
  await box.fill(cannedTurn.buyer)
  await box.press('Enter')
  const live = page.locator('[data-testid="turn"][data-live]')
  await expect(live.getByTestId('supplier-reply')).toContainText('Then 3% applies from the next order')
  await expect(live.getByTestId('coach-card')).toHaveAttribute('data-assessment', 'ok')
  await expect(page.getByTestId('live-locked')).toHaveText('Preview: one live turn per session.')
  await expect(page.getByTestId('live-form')).toHaveCount(0)
  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(page.getByTestId('live-form')).toBeVisible()
})

test('T6 a rejected live turn shows the inline error and keeps the form', async ({ page }) => {
  await page.route('**/rest/v1/rpc/start_live_session', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '424243' }))
  await page.route('**/functions/v1/trainer-turn', (r) => r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'rejected', reasons: ['number not in input: €19,200'] }) }))
  await page.goto('/trainer')
  await page.getByRole('button', { name: 'Show all turns' }).click()
  const form = page.getByTestId('live-form')
  await form.getByLabel('Your next message').fill('We want a 5% discount.')
  await form.getByRole('button', { name: 'Send' }).click()
  await expect(form.getByTestId('live-error')).toContainText('did not pass the checks')
  await expect(form.getByTestId('live-error')).toContainText('€19,200')
  await expect(form.getByLabel('Your next message')).toBeEnabled()
})
