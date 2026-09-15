// T4: seed the stored negotiation-trainer session with Getriebebau Arnold: five scripted buyer messages, the model answers
// as supplier and coach once, everything is stored and the page replays it without an API call. Resumes where the session
// stopped, so a rerun never pays twice. Prints the spend. Run: node scripts/trainer-seed.mjs [number of turns]
import { env, rest, spent } from './llm-lib.mjs'

export const BUYER_TURNS = [
  'Thanks for taking the time. In 2026 we bought €23,170,426 from you, so we want this to work for both sides. Two topics today: prices on orders that went out without a contract reference, and your Skonto terms across our plants.',
  'Let me start with order 508565: 223 Planetengetriebe at €1,038.91, while contract 4602358 sets €866.70. That is €38,403 on one line, and €412,387 on 24 lines across 4 contracts this year. We expect the contract price on those lines and a credit note for the difference.',
  'Agreed, the missing reference was our mistake at order entry, and we are fixing it. The contract still covers these articles and this period whatever the reference field says, and you invoiced €1,038.91 against €866.70. We need the credit note for the 24 lines and the contract price on every new order.',
  'Second topic. You already grant 3% Skonto on €7,445,353 of our Chemnitz orders. On €7,520,999 of orders for Hamburg we get a lower rate or none. We want 3% Skonto in Hamburg from the next order, and we will pay within the Skonto period.',
  'To sum up: the contract price on the unreferenced lines plus a credit note for 2026, and 3% Skonto for Hamburg from the next order. Can you confirm both in writing by Friday?',
]

const e = env()
const limit = Number(process.argv[2] ?? BUYER_TURNS.length)
const [session] = await rest(e, 'mvp_trainer_sessions?select=id&kind=eq.stored&supplier_no=eq.3000742&period_start=eq.2026-01-01&period_end=eq.2026-12-31')
if (!session) { console.log('no stored session for Getriebebau Arnold 2026 (apply reco_trainer.sql)'); process.exit(1) }
const done = await rest(e, `mvp_trainer_turns?select=turn_no&session_id=eq.${session.id}`)
const before = await spent(e)
for (let i = done.length; i < Math.min(limit, BUYER_TURNS.length); i++) {
  const r = await fetch(`${e.VITE_SUPABASE_URL}/functions/v1/trainer-turn`, { method: 'POST', headers: { apikey: e.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${e.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: session.id, buyer_message: BUYER_TURNS[i] }) })
  const res = await r.json()
  if (res.error) { console.log(`turn ${i + 1}: ${res.error} ${(res.reasons ?? []).join('; ')}`); process.exit(1) }
  const t = res.turn
  console.log(`turn ${t.turn_no} (${res.usage.est_cost_usd.toFixed(4)} USD)`)
  console.log(`  buyer:    ${t.buyer}`)
  console.log(`  supplier: ${t.supplier.message} [concession ${t.supplier.concession}]`)
  console.log(`  coach:    ${t.coach.assessment}, ${t.coach.note} Next: ${t.coach.next_fact_id}`)
}
const after = await spent(e)
const turns = await rest(e, `mvp_trainer_turns?select=turn_no&session_id=eq.${session.id}`)
console.log(`stored session ${session.id}: ${turns.length} turns; seed spend ${(after - before).toFixed(4)} USD; cumulative ${after.toFixed(4)} of 3.50 USD`)
