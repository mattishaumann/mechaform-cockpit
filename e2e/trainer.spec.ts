import { expect, test } from '@playwright/test'

// The trainer opens on three recommended negotiations (Index Guard findings where nothing is agreed), then a case
// gives its brief, what we know about the supplier, and a practice chat. The stored Arnold session replays without a model call.
test('T5 trainer: Preview pill, roadmap, three recommended cases, stored example steps without calling the model', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (r) => { if (r.url().includes('/functions/v1/trainer-turn')) calls.push(r.url()) })
  await page.goto('/trainer')
  await expect(page.getByTestId('preview-pill')).toHaveText('Preview')
  await expect(page.getByTestId('roadmap-stage')).toHaveCount(3)
  await expect(page.getByTestId('candidate')).toHaveCount(3, { timeout: 20_000 })
  const first = page.getByTestId('candidate').first()
  await expect(first).toContainText('Drehtechnik Eifel GmbH')
  await expect(first).toContainText('€254,057')
  await expect(first).toContainText('above the cost basket')
  await page.getByTestId('pick-example').click()
  const brief = page.getByTestId('brief-panel')
  await expect(brief).toContainText('€412,387')
  await expect(brief).toContainText('€183,204')
  await expect(page.getByTestId('history-panel')).toContainText('First order')
  await expect(page.getByTestId('replay-hint')).toBeVisible()
  for (let i = 1; i <= 5; i++) {
    await page.getByTestId('next-turn').click()
    await expect(page.getByTestId('coach-card')).toHaveCount(i)
  }
  await expect(page.getByTestId('chat')).toBeVisible()
  expect(calls).toHaveLength(0)
})

test('T5 a recommended case shows its brief, its history and an empty chat', async ({ page }) => {
  await page.goto('/trainer')
  await page.getByTestId('candidate').first().click()
  await expect(page.getByTestId('brief-panel')).toContainText('Index Guard', { timeout: 20_000 })
  const history = page.getByTestId('history-panel')
  await expect(history).toContainText('Supplies')
  await expect(history).toContainText('Not in the data')
  await expect(page.getByTestId('chat-empty')).toContainText('Suggested opening')
  await expect(page.getByTestId('why-panel')).toContainText('above the cost basket')
  await expect(page.getByTestId('chat')).toContainText('8 turns left')
  await page.getByTestId('back-to-cases').click()
  await expect(page.getByTestId('candidate')).toHaveCount(3)
})

const cannedTurn = (turn_no: number) => ({ id: turn_no, session_id: 424242, turn_no, buyer: 'Our Hamburg payment run can settle within the Skonto period.',
  supplier: { message: 'Then 3% applies from the next order, with the renewal signed.', concession: 'partial', numbers_used: [] },
  coach: { assessment: 'ok', note: 'You answered the working-capital argument. Anchor on the total next.', next_fact_id: 'index_guard', used_fact_ids: ['terms_floor'] } })

test('T6 practice chat (answers routed, no spend): turns stack up and the turn counter falls', async ({ page }) => {
  let n = 0
  await page.route('**/rest/v1/rpc/start_trainer_session', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '424242' }))
  await page.route('**/functions/v1/trainer-turn', (r) => { n += 1; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turn: cannedTurn(n) }) }) })
  await page.goto('/trainer')
  await page.getByTestId('candidate').first().click()
  const box = page.getByTestId('chat-form').getByLabel('Your next message')
  await expect(box).toHaveValue(/Thank you for making time.*above our cost index basket/s)   // the suggested opening, built in SQL
  await box.fill('')
  await expect(page.getByTestId('chat-form').getByRole('button', { name: 'Send' })).toBeDisabled()
  await box.fill('Your prices run 12.1% above the basket on the articles without a contract.')
  await box.press('Enter')
  await expect(page.locator('[data-testid="turn"][data-live]')).toHaveCount(1)
  await expect(page.getByTestId('chat')).toContainText('7 turns left')
  await box.fill('We want the correction from the next order.')
  await box.press('Enter')
  await expect(page.locator('[data-testid="turn"][data-live]')).toHaveCount(2)
  await expect(page.getByTestId('coach-card').last()).toHaveAttribute('data-assessment', 'ok')
})

test('T6 start over clears the practice conversation and opens a fresh session', async ({ page }) => {
  const sessions: string[] = []
  await page.route('**/rest/v1/rpc/start_trainer_session', (r) => { sessions.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', body: String(424250 + sessions.length) }) })
  await page.route('**/functions/v1/trainer-turn', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turn: cannedTurn(1) }) }))
  await page.goto('/trainer')
  await page.getByTestId('candidate').first().click()
  const box = page.getByTestId('chat-form').getByLabel('Your next message')
  await expect(page.getByTestId('start-over')).toBeDisabled()   // nothing to throw away yet
  await box.fill('Your prices run above the basket on the articles without a contract.')
  await box.press('Enter')
  await expect(page.locator('[data-testid="turn"][data-live]')).toHaveCount(1)
  await page.getByTestId('start-over').click()
  await expect(page.getByTestId('start-over-confirm')).toContainText('stored example session stays')
  await page.getByTestId('start-over-yes').click()
  await expect(page.locator('[data-testid="turn"][data-live]')).toHaveCount(0)
  await expect(page.getByTestId('chat')).toContainText('8 turns left')
  await expect(box).toHaveValue(/Thank you for making time/)   // the suggested opening is back
  await box.fill('Second run, first message.')
  await box.press('Enter')
  await expect(page.locator('[data-testid="turn"][data-live]')).toHaveCount(1)
  expect(sessions).toHaveLength(2)   // the next send opened a new session rather than continuing the old one
})

test('T6 while the supplier answers, the typing indicator says who is answering and then goes', async ({ page }) => {
  await page.route('**/rest/v1/rpc/start_trainer_session', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '424244' }))
  await page.route('**/functions/v1/trainer-turn', async (r) => {
    await new Promise((done) => setTimeout(done, 1500))   // a real model turn takes seconds; the wait is what the indicator covers
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ turn: cannedTurn(1) }) })
  })
  await page.goto('/trainer')
  await page.getByTestId('candidate').first().click()
  const box = page.getByTestId('chat-form').getByLabel('Your next message')
  // the box grows to fit the suggested opening instead of scrolling inside a small field
  expect(await box.evaluate((el) => el.clientHeight)).toBeGreaterThan(160)
  await box.fill('Your prices run above the basket on the articles without a contract.')
  await box.press('Enter')
  const typing = page.getByTestId('typing')
  await expect(typing).toContainText('is answering')
  await expect(typing).toHaveAttribute('role', 'status')
  await expect(page.locator('[data-testid="turn"][data-live]')).toHaveCount(1)
  await expect(typing).toHaveCount(0)
})

test('T6 a rejected reply shows the inline error and keeps the message', async ({ page }) => {
  await page.route('**/rest/v1/rpc/start_trainer_session', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '424243' }))
  await page.route('**/functions/v1/trainer-turn', (r) => r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'rejected', reasons: ['number not in input: €19,200'] }) }))
  await page.goto('/trainer')
  await page.getByTestId('candidate').first().click()
  const form = page.getByTestId('chat-form')
  await form.getByLabel('Your next message').fill('We want a 5% discount.')
  await form.getByRole('button', { name: 'Send' }).click()
  await expect(form.getByTestId('live-error')).toContainText('did not pass the checks')
  await expect(form.getByLabel('Your next message')).toBeEnabled()
})

test('T9 target any supplier from the list and get a suggested opening for it', async ({ page }) => {
  await page.goto('/trainer')
  const search = page.getByTestId('supplier-search')
  await search.getByLabel('Supplier name').fill('Lausitz')
  await search.getByRole('button', { name: 'Or target a supplier' }).click()
  const hits = page.getByTestId('search-hit')
  await expect(hits.first()).toContainText('Lausitz', { timeout: 20_000 })
  await hits.first().click()
  await expect(page.getByTestId('history-panel')).toContainText('Supplies', { timeout: 20_000 })
  await expect(page.getByTestId('why-panel')).toHaveCount(0)   // only a recommended case carries the reason
  await expect(page.getByTestId('chat-form').getByLabel('Your next message')).toHaveValue(/Thank you for making time/)
})
