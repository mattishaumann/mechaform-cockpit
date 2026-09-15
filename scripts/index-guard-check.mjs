// Spec mvp-index-guard: data checks for the Index Guard preview agent, through the REST API with the anon key.
// Recomputes index prices of sample findings independently from v_order_lines, v_article_basket and index_series.
// Run after a 2026 Index Guard run: node scripts/index-guard-check.mjs
import { env, rest } from './llm-lib.mjs'

const e = env()
let failed = 0
// REST returns at most 1,000 rows per request; page through larger sets
const restAll = async (path) => { const out = []; for (let off = 0; ; off += 1000) { const b = await rest(e, `${path}${path.includes('?') ? '&' : '?'}limit=1000&offset=${off}`); out.push(...b); if (b.length < 1000) return out } }
const check = (name, cond, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); if (!cond) failed++ }

// I2: the index data declares itself as sample, series complete, basket weights sum to 1
const defs = await rest(e, 'index_definitions?select=index_code,is_sample')
const series = await restAll('index_series?select=index_code,month,value&order=index_code,month')
const basket = await restAll('category_index_map?select=category_no,material_type,component,weight&order=category_no,material_type,component')
check('I2 every index definition is flagged as sample', defs.length > 0 && defs.every((d) => d.is_sample === true), `${defs.length} definitions`)
const perIndex = Object.groupBy(series, (s) => s.index_code)
check('I2 every index has 36 monthly values (2024-01 to 2026-12)', defs.every((d) => (perIndex[d.index_code] ?? []).length === 36))
const sums = Object.entries(Object.groupBy(basket, (b) => `${b.category_no}|${b.material_type}`)).map(([k, v]) => [k, v.reduce((a, b) => a + Number(b.weight), 0)])
check('I2 basket weights sum to 1 per category and material', sums.every(([, s]) => Math.abs(s - 1) < 1e-9), `${sums.length} baskets`)

// I4: the 2026 run's findings are all above the tolerance band and carry the sample flag
const runs = await rest(e, 'v_latest_runs?select=id,case_name,rows,total&agent=eq.index_guard&period_start=eq.2026-01-01&period_end=eq.2026-12-31')
const line = runs.find((r) => r.case_name === 'Index Guard'), con = runs.find((r) => r.case_name === 'Index Guard (contracts)')
check('I4 a 2026 run exists for both layers', Boolean(line && con), runs.map((r) => `${r.case_name}: ${r.rows} rows, ${Math.round(r.total)}`).join('; '))
const tol = Number((await rest(e, 'mvp_config?select=value&key=eq.index_tolerance'))[0]?.value)
const rows = line ? await restAll(`mvp_register?select=id,order_no,order_date,supplier_no,article_no,baseline,target,gap_eur,volume,detail,recommendation&run_id=eq.${line.id}&order=id`) : []
// the band test on unrounded prices: paid price above index price x (1 + tolerance); detail.deviation is rounded to 4 decimals
check('I4 every order finding lies above index price x (1 + tolerance)', rows.length > 0 && rows.every((r) => Number(r.baseline) > Number(r.detail.index_price) * (1 + tol) - 1e-4 && Number(r.target) > 0 && Math.abs(Number(r.target) / Number(r.detail.index_price) - (1 + tol)) < 1e-4), `${rows.length} rows, tolerance ${tol}`)
check('I4 every stored deviation is at least the tolerance (4 decimals)', rows.every((r) => Number(r.detail.deviation) >= tol))
check('I4 every order finding has a positive gap above the band', rows.every((r) => Number(r.gap_eur) > 0 && Number(r.baseline) > Number(r.target)))
check('I4 every order finding carries the sample flag and a recommendation', rows.every((r) => r.detail.sample_index === true && r.recommendation?.sequence === 'internal_only'))

// I5: the Lausitz casting 700001 is flagged on every 2026 order, more than 10% above its index price
const laus = rows.filter((r) => r.article_no === 700001 && r.supplier_no === 3000544)
check('I5 Gussgehäuse M12 700001 at Eisengießerei Lausitz flagged on 12 orders, each more than 10% above the index price', laus.length === 12 && laus.every((r) => Number(r.detail.deviation) > 0.10),
  laus.map((r) => (Number(r.detail.deviation) * 100).toFixed(1) + '%').join(', '))

// I3: recompute the index price of five findings from raw rows and compare
const idxAt = (code, day) => { const m = day.slice(0, 7) + '-01'; const pts = (perIndex[code] ?? []).filter((p) => p.month <= m); return pts.length ? Number(pts[pts.length - 1].value) : null }
const sample = [...rows].sort((a, b) => b.gap_eur - a.gap_eur).filter((_, i) => i % Math.max(1, Math.floor(rows.length / 5)) === 0).slice(0, 5)
for (const f of sample) {
  const lines = await rest(e, `v_order_lines?select=year,order_date,quantity,unit_price&supplier_no=eq.${f.supplier_no}&article_no=eq.${f.article_no}`)
  const baseYear = Math.min(...lines.map((l) => l.year)); const bl = lines.filter((l) => l.year === baseYear)
  const q = bl.reduce((a, l) => a + Number(l.quantity), 0); const p0 = bl.reduce((a, l) => a + Number(l.quantity) * Number(l.unit_price), 0) / q
  const comps = await rest(e, `v_article_basket?select=component,weight&article_no=eq.${f.article_no}`)
  let factor = 0
  for (const c of comps) {
    if (c.component === 'FIXED') { factor += Number(c.weight); continue }
    const i0 = bl.reduce((a, l) => a + Number(l.quantity) * idxAt(c.component, l.order_date), 0) / q
    factor += Number(c.weight) * idxAt(c.component, f.order_date) / i0
  }
  const mine = p0 * factor, db = Number(f.detail.index_price)
  check(`I3 order ${f.order_no} article ${f.article_no}: index price recomputed ${mine.toFixed(4)} = stored ${db.toFixed(4)}`, Math.abs(mine - db) < 0.01)
}

// I6: every contract finding names an existing framework contract of the same supplier and article
const crows = con ? await restAll(`mvp_register?select=supplier_no,article_no,detail&run_id=eq.${con.id}&order=id`) : []
const contracts = new Set((await restAll('framework_contracts?select=contract_no,supplier_no,article_no&order=contract_no,contract_position_no')).map((c) => `${c.contract_no}|${c.supplier_no}|${c.article_no}`))
check('I6 every contract finding names an existing contract of the same pair', crows.length > 0 && crows.every((r) => contracts.has(`${r.detail.contract_no}|${r.supplier_no}|${r.article_no}`)), `${crows.length} contract positions`)

console.log(failed ? `${failed} check(s) failed` : 'all checks pass')
process.exit(failed ? 1 : 0)
