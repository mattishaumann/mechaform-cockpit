// A6: draft the three highest-gap findings per case (15 drafts) so the demo never waits and never burns budget live.
// Stops and reports if the estimated spend exceeds 1 USD. Run: node scripts/precompute-drafts.mjs
import { draft, env, rest, spent } from './llm-lib.mjs'

const e = env()
const CASES = ['Contract Guard', 'Tier Guard', 'Terms Floor', 'Price Radar', 'Preferred Steering']
const runs = await rest(e, 'v_latest_runs?select=id,case_name&period_start=eq.2026-01-01&period_end=eq.2026-12-31')
let before = await spent(e)
console.log(`spent so far: ${before.toFixed(4)} USD`)
for (const c of CASES) {
  const run = runs.find((r) => r.case_name === c)
  if (!run) { console.log(`${c}: no 2026 run, skipped`); continue }
  const rows = await rest(e, `mvp_register?select=id,gap_eur&run_id=eq.${run.id}&order=gap_eur.desc&limit=3`)
  const task = ['Price Radar', 'Preferred Steering'].includes(c) ? 'explain_for_cfo' : 'draft_supplier_message'
  for (const r of rows) {
    const res = await draft(e, r.id, task)
    const tag = res.error ? `error ${res.error}${res.reasons ? ': ' + res.reasons.join('; ') : ''}` : `${res.cached ? 'cached' : 'new'} ${res.draft.document_type}${res.draft.refused ? ' (refused)' : ''}`
    console.log(`${c} #${r.id} ${task}: ${tag}${res.usage ? ` ${res.usage.est_cost_usd.toFixed(4)} USD` : ''}`)
    if (res.error === 'budget_exhausted' || res.error === 'missing_api_key') { console.log('stopping:', res.error); process.exit(1) }
    const now = await spent(e)
    if (now - before > 1) { console.log(`stopping: precompute spend ${(now - before).toFixed(4)} USD exceeds 1 USD`); process.exit(1) }
  }
}
const after = await spent(e)
const drafts = await rest(e, 'mvp_drafts?select=id')
console.log(`drafts stored: ${drafts.length}; precompute spend: ${(after - before).toFixed(4)} USD; cumulative: ${after.toFixed(4)} USD`)
