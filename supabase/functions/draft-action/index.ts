// draft-action: turns one finding's evidence into a German supplier message or an internal briefing.
// The rules computed every number; the model only writes language. Cached per finding and task; hard budget guard.
import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 700
const MAX_ROWS = 25
const BUDGET_USD = 3.5
const PRICE = { input: 1e-6, output: 5e-6, cached: 0.1e-6 }
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SYSTEM = `You draft supplier messages and internal briefings for the procurement team of MechaForm GmbH,
a German industrial manufacturer. All facts have already been computed by deterministic rules.
You write language, you do not compute.

Rules:
1. Use only numbers present in INPUT. Never compute, convert, round or invent a number. Echo every
   number you use in numbers_used with its source_field. If you would need a number that is not in
   INPUT, leave it out.
2. Every factual sentence in the body must be traceable to at least one order_no in INPUT. List them
   in claims_used.
3. Never mention a contract clause, term or document that is not in INPUT.
4. German by default for supplier messages ("Sie" form, plain professional tone). English only when
   task is explain_for_cfo and the case name is English.
5. Document types: Contract Guard recovery is a "Belastungsanzeige" that cites the contract number.
   Tier Guard is a "Preiskorrektur" request that names the tier and its price. Terms Floor is a
   "Konditionenanfrage" that cites the Skonto the supplier already grants on its other lines.
   Price Radar and Preferred Steering are internal "Verhandlungsbriefing" only: never a supplier
   message, and every index-based figure is labelled as an assumption and as cost avoidance.
   Never use the word "Gutschrift"; under German VAT law it denotes self-billing.
6. If evidence_rows has fewer than min_rows entries, or confidence is below confidence_floor for a
   supplier message, set refused true with a short reason and leave draft fields empty.
7. Tone: plain, factual, courteous. Sentence case. No em dashes, no exclamation marks, no marketing
   language, no threats. End supplier messages with a concrete request and a proposed deadline only
   if a date is provided in INPUT; otherwise ask for a reply "innerhalb von 10 Werktagen".
8. Body has at most 5 short paragraphs.`

const TOOL = {
  name: 'draft_action',
  description: 'Return the validated draft for one finding.',
  input_schema: {
    type: 'object', additionalProperties: false,
    required: ['language', 'document_type', 'refused', 'refusal_reason', 'draft', 'claims_used', 'numbers_used', 'confidence_note'],
    properties: {
      language: { type: 'string', enum: ['de', 'en'] },
      document_type: { type: 'string', enum: ['Belastungsanzeige', 'Preiskorrektur', 'Konditionenanfrage', 'Verhandlungsbriefing', 'Erlaeuterung'] },
      refused: { type: 'boolean' }, refusal_reason: { type: 'string' },
      draft: { type: 'object', additionalProperties: false, required: ['subject', 'salutation', 'body', 'closing'],
        properties: { subject: { type: 'string' }, salutation: { type: 'string' }, body: { type: 'array', items: { type: 'string' }, maxItems: 5 }, closing: { type: 'string' } } },
      claims_used: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['claim', 'order_nos'], properties: { claim: { type: 'string' }, order_nos: { type: 'array', items: { type: 'string' } } } } },
      numbers_used: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['value', 'unit', 'source_field'], properties: { value: { type: 'string' }, unit: { type: 'string' }, source_field: { type: 'string' } } } },
      confidence_note: { type: 'string' },
    },
  },
}

const CASE_KEY: Record<string, string> = { 'Contract Guard': 'contract_guard', 'Tier Guard': 'tier_guard', 'Tier Guard (annual volume)': 'tier_guard', 'Terms Floor': 'terms_floor', 'Price Radar': 'price_radar', 'Preferred Steering': 'preferred_steering' }
const INTERNAL = new Set(['price_radar', 'preferred_steering'])
const RECOVERY = /zurückfordern|erstatten|recover|reclaim/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let body: { register_id?: number; task?: string; force?: boolean }
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }
  const registerId = Number(body.register_id)
  const task = body.task === 'explain_for_cfo' ? 'explain_for_cfo' : 'draft_supplier_message'
  if (!registerId) return json({ error: 'bad_request' }, 400)

  const { data: finding } = await admin.from('mvp_register').select('*').eq('id', registerId).maybeSingle()
  if (!finding) return json({ error: 'unknown_finding' }, 404)

  if (!body.force) {
    const { data: cached } = await admin.from('mvp_drafts').select('id,payload,created_at').eq('register_id', registerId).eq('task', task).order('id', { ascending: false }).limit(1).maybeSingle()
    if (cached) return json({ draft: cached.payload, draft_id: cached.id, cached: true, created_at: cached.created_at })
  }
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'missing_api_key' })
  const { data: spent } = await admin.from('mvp_llm_calls').select('est_cost_usd')
  const total = (spent ?? []).reduce((s, r) => s + Number(r.est_cost_usd ?? 0), 0)
  if (total > BUDGET_USD) return json({ error: 'budget_exhausted', spent_usd: total })

  // assemble the input: case, supplier, up to 25 evidence rows, totals
  const { data: run } = await admin.from('agent_runs').select('agent,period_start,period_end').eq('id', finding.run_id).maybeSingle()
  const caseKey = run?.agent ?? CASE_KEY[finding.case] ?? 'contract_guard'
  const { data: caseRow } = await admin.from('mvp_cases').select('*').eq('case_key', caseKey).maybeSingle()
  const { data: supplier } = finding.supplier_no ? await admin.from('suppliers').select('supplier_no,name,location,supplier_status').eq('supplier_no', finding.supplier_no).maybeSingle() : { data: null }
  let q = admin.from('v_order_lines').select('order_no,order_position,article_no,description,plant,quantity,unit_price,spend,contract_no,payment_terms_p1,payment_terms_t1,payment_terms_t3,delivery_date,requested_delivery_date')
  if (run) q = q.gte('order_date', run.period_start).lte('order_date', run.period_end)
  if (finding.article_no) q = q.eq('article_no', finding.article_no)
  if (finding.supplier_no) q = q.eq('supplier_no', finding.supplier_no)
  const { data: lines } = await q.order('order_date').limit(MAX_ROWS)
  let contractNo: string | null = null, tier: { tier_level: number; tier_price: number } | null = null
  if (caseKey === 'contract_guard' && finding.supplier_no && finding.article_no) {
    const { data: c } = await admin.from('framework_contracts').select('contract_no').eq('supplier_no', finding.supplier_no).eq('article_no', finding.article_no).limit(1).maybeSingle()
    contractNo = c?.contract_no ?? null
  }
  if (caseKey === 'tier_guard' && finding.supplier_no && finding.article_no) {
    const { data: t } = await admin.from('price_tiers').select('tier_level,tier_price').eq('supplier_no', finding.supplier_no).eq('article_no', finding.article_no).lte('min_quantity', finding.volume).order('tier_level', { ascending: false }).limit(1).maybeSingle()
    tier = t ?? null
  }
  const fmt = (v: unknown) => (v == null ? null : typeof v === 'number' ? Number(v.toFixed(2)) : Number.isNaN(Number(v)) ? v : Number(Number(v).toFixed(2)))
  const evidence = (lines ?? []).map((l) => ({
    order_no: String(l.order_no), pos: l.order_position, article_no: l.article_no, description: l.description, plant: l.plant, quantity: fmt(l.quantity), unit_price: fmt(l.unit_price), unit: 'EUR/piece', spend: fmt(l.spend),
    contract_no: l.contract_no ?? null, contract_price: caseKey === 'contract_guard' ? fmt(finding.target) : null, tier_price: tier ? fmt(tier.tier_price) : null, tier_level: tier?.tier_level ?? null,
    payment_terms_p1: l.payment_terms_p1, payment_terms_t1: l.payment_terms_t1, payment_terms_t3: l.payment_terms_t3, delivery_date: l.delivery_date, requested_delivery_date: l.requested_delivery_date,
  }))
  const input = {
    case: { case_key: caseKey, name: caseRow?.name, rule: caseRow?.rule, customer_action: caseRow?.customer_action, confidence: Number(caseRow?.confidence ?? 0), action_type: finding.action_type, min_rows: 3, confidence_floor: 0.5, contract_no: contractNo, index_assumption: caseKey === 'price_radar' ? '2% per year, assumed' : undefined },
    supplier, evidence_rows: evidence,
    precomputed_totals: { lines: evidence.length, volume: fmt(finding.volume), baseline: fmt(finding.baseline), target: fmt(finding.target), gap_eur: fmt(finding.gap_eur) },
    task,
  }
  const inputText = JSON.stringify(input)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }], tools: [TOOL], tool_choice: { type: 'tool', name: 'draft_action' }, messages: [{ role: 'user', content: `INPUT:\n${inputText}\nProduce the draft_action tool call.` }] }),
  })
  const out = await res.json()
  const usage = out.usage ?? {}
  const inTok = Number(usage.input_tokens ?? 0), outTok = Number(usage.output_tokens ?? 0), cacheRead = Number(usage.cache_read_input_tokens ?? 0), cacheWrite = Number(usage.cache_creation_input_tokens ?? 0)
  const cost = (inTok + cacheWrite) * PRICE.input + cacheRead * PRICE.cached + outTok * PRICE.output
  const log = async (rejected: string | null) => { await admin.from('mvp_llm_calls').insert({ register_id: registerId, task, input_tokens: inTok + cacheWrite, output_tokens: outTok, cached_input_tokens: cacheRead, est_cost_usd: cost, rejected_reason: rejected }) }
  if (!res.ok) { await log(`api_${res.status}: ${JSON.stringify(out).slice(0, 200)}`); return json({ error: 'api_error', status: res.status, detail: out.error?.message ?? null }, 502) }
  const toolUse = (out.content ?? []).find((c: { type: string }) => c.type === 'tool_use')
  const draft = toolUse?.input
  if (!draft) { await log('no_tool_use'); return json({ error: 'no_tool_use' }, 502) }

  // post-generation checks: numbers from input only, claims on real orders, forbidden words, refusal shape
  const reasons: string[] = []
  const orderNos = new Set(evidence.map((e) => e.order_no))
  for (const n of draft.numbers_used ?? []) if (!inputText.includes(String(n.value))) reasons.push(`number not in input: ${n.value}`)
  for (const c of draft.claims_used ?? []) for (const o of c.order_nos ?? []) if (!orderNos.has(String(o))) reasons.push(`order not in evidence: ${o}`)
  const bodyText = (draft.draft?.body ?? []).join('\n')
  if (/Gutschrift/i.test(bodyText)) reasons.push('Gutschrift')
  if (bodyText.includes('—')) reasons.push('em dash')
  if (bodyText.includes('!')) reasons.push('exclamation mark')
  if (INTERNAL.has(caseKey) && RECOVERY.test(bodyText)) reasons.push('recovery verb in internal briefing')
  if (INTERNAL.has(caseKey) && task === 'draft_supplier_message' && !draft.refused) reasons.push('supplier message for an internal-only case')
  if (draft.refused && (draft.draft?.body ?? []).length > 0) reasons.push('refused with non-empty body')
  if (reasons.length) { await log(reasons.join('; ')); return json({ error: 'rejected', reasons, spent_usd: total + cost }, 422) }
  await log(null)
  const { data: stored } = await admin.from('mvp_drafts').insert({ register_id: registerId, case_key: caseKey, task, model: MODEL, input_tokens: inTok + cacheWrite, output_tokens: outTok, payload: draft }).select('id,created_at').single()
  if (!draft.refused) {
    await admin.from('mvp_register').update({ status: 'draft_ready', draft_id: stored?.id }).eq('id', registerId).eq('status', 'open')
    await admin.from('mvp_events').insert({ case_key: caseKey, register_id: registerId, event_type: 'draft_ready', message: `${finding.case}: draft ready for finding ${registerId} (${draft.document_type})` })
  }
  return json({ draft, draft_id: stored?.id, cached: false, created_at: stored?.created_at, usage: { input_tokens: inTok, output_tokens: outTok, cached_input_tokens: cacheRead, est_cost_usd: cost, spent_usd: total + cost } })
})
