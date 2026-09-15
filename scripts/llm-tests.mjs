// A5: the three cases from the brief, run once against the API, cached afterwards. Run: node scripts/llm-tests.mjs
import { draft, env, rest } from './llm-lib.mjs'

const e = env()
const FORCE = process.env.FORCE === '1'   // FORCE=1 bypasses cached drafts and spends on fresh calls
const runs = await rest(e, 'v_latest_runs?select=id,case_name&period_start=eq.2026-01-01&period_end=eq.2026-12-31')
const runId = (c) => runs.find((r) => r.case_name === c)?.id
const find = async (c, filter) => (await rest(e, `mvp_register?select=id&run_id=eq.${runId(c)}&${filter}&limit=1`))[0]?.id
const results = []
const check = (name, cond, detail) => { results.push({ name, ok: Boolean(cond), detail }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`) }
const numbers = (d) => (d.numbers_used ?? []).map((n) => String(n.value))
const has = (arr, v) => arr.some((x) => x.replace(/[.,]/g, '') === String(v).replace(/[.,]/g, ''))
const bodyOf = (d) => (d.draft?.body ?? []).join('\n')

// Test 1: Contract Guard, order 508565, article 703947
const id1 = await find('Contract Guard', 'order_no=eq.508565&article_no=eq.703947')
const r1 = await draft(e, id1, 'draft_supplier_message', FORCE)
if (r1.error) { console.log('test 1 error', r1); process.exit(1) }
const d1 = r1.draft
check('1 document_type Belastungsanzeige', d1.document_type === 'Belastungsanzeige', d1.document_type)
check('1 not refused', d1.refused === false, d1.refusal_reason)
check('1 numbers 866.70, 1038.91, 4602358', has(numbers(d1), '866.70') && has(numbers(d1), '1038.91') && has(numbers(d1), '4602358'), numbers(d1).join(','))
check('1 claims include 508565', (d1.claims_used ?? []).some((c) => c.order_nos.includes('508565')))
check('1 no Gutschrift', !/Gutschrift/i.test(bodyOf(d1)))

// Test 2: Tier Guard, order 606892
const id2 = await find('Tier Guard', 'order_no=eq.606892')
const r2 = await draft(e, id2, 'draft_supplier_message', FORCE)
if (r2.error) { console.log('test 2 error', r2); process.exit(1) }
const d2 = r2.draft
check('2 document_type Preiskorrektur', d2.document_type === 'Preiskorrektur', d2.document_type)
check('2 numbers 185.74, 233.41, 156, 136', ['185.74', '233.41', '156', '136'].every((v) => has(numbers(d2), v)), numbers(d2).join(','))
check('2 body names tier 2', /(Stufe|Staffel|Tier)\s*2/i.test(bodyOf(d2)))

// Test 3: Price Radar, article 700001: supplier message refused, CFO briefing allowed
const id3 = await find('Price Radar', 'article_no=eq.700001')
const r3a = await draft(e, id3, 'draft_supplier_message', FORCE)
check('3a supplier message refused', r3a.error === 'rejected' || r3a.draft?.refused === true, r3a.error ?? r3a.draft?.refusal_reason)
const r3b = await draft(e, id3, 'explain_for_cfo', FORCE)
if (r3b.error) { console.log('test 3b error', r3b); process.exit(1) }
const d3 = r3b.draft
check('3b document_type Verhandlungsbriefing', d3.document_type === 'Verhandlungsbriefing', d3.document_type)
check('3b body has Annahme and Kostenvermeidung', /Annahme/.test(bodyOf(d3)) && /Kostenvermeidung/.test(bodyOf(d3)))
check('3b no recovery verbs', !/zurückfordern|erstatten|recover|reclaim/i.test(bodyOf(d3)))
const failed = results.filter((r) => !r.ok).length
console.log(`${results.length - failed} of ${results.length} checks pass`)
process.exit(failed ? 1 : 0)
