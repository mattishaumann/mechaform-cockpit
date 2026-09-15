// R23: the two drafts the demo opens from the recommendation card, regenerated with the step-5 payload
// (recommendation and facts inside the untrusted block). Prints each draft and the spend. Run: node scripts/precompute-demo-drafts.mjs [case name]
import { draft, env, rest, spent } from './llm-lib.mjs'

const e = env()
const runs = await rest(e, 'v_latest_runs?select=id,case_name&period_start=eq.2026-01-01&period_end=eq.2026-12-31')
const runId = (c) => runs.find((r) => r.case_name === c)?.id
const TARGETS = [
  ['Contract Guard', 'order_no=eq.508565&article_no=eq.703947'],   // Belastungsanzeige, contract 4602358
  ['Terms Floor', 'supplier_no=eq.3000742'],                       // Konditionenanfrage, Getriebebau Arnold
]
const only = process.argv[2]   // optional case name, e.g. "Terms Floor", to regenerate one draft
const before = await spent(e)
for (const [c, filter] of TARGETS.filter(([c]) => !only || c === only)) {
  const [row] = await rest(e, `mvp_register?select=id&run_id=eq.${runId(c)}&${filter}`)
  const res = await draft(e, row.id, 'draft_supplier_message', true)
  if (res.error) { console.log(`${c} #${row.id}: error ${res.error} ${(res.reasons ?? []).join('; ')}`); process.exit(1) }
  console.log(`${c} #${row.id}: ${res.draft.document_type}, ${res.evidence_count} evidence rows, ${res.usage.est_cost_usd.toFixed(4)} USD`)
  console.log(`  ${res.draft.draft.subject}`)
  for (const p of res.draft.draft.body) console.log(`  | ${p}`)
}
const after = await spent(e)
console.log(`demo drafts: ${(after - before).toFixed(4)} USD; cumulative ${after.toFixed(4)} of 3.50 USD`)
