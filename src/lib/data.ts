import { supabase } from './supabase'
import { toNumber } from './format'
import type { Period } from './period'

export interface CaseRow { case_key: string; name: string; trigger: string; rule: string; inputs: string[]; evidence_required: string; customer_action: string; example: Record<string, unknown>; calculation: string; value_2026: number; rows: number; confidence: number; action_type: string | null; summary: string | null; enabled: boolean }
export interface SavingsSplit { hard: number; cost_avoidance: number; gross: number; hard_contract_guard: number; hard_tier_guard: number; hard_preferred_steering: number; hard_terms_floor: number }
export interface ConfigRow { key: string; value: number; unit: string; label: string; case_key: string | null; note: string | null }
export interface RunRow { id: number; agent: string; case_name: string; period_start: string; period_end: string; started_at: string; finished_at: string | null; status: string; rows: number; total: number; lines_checked: number | null }
export interface Recipient { role: string; id: string | null; plant?: string; why: string; how: 'task'; due_days: number }
export interface Recommendation { internal: Recipient[]; external: { recipient: string; document_type: string; how: 'email_draft' } | null; sequence: 'internal_first' | 'external_first' | 'internal_only'; rationale: string }
export interface RegisterRow { id: number; case: string; order_no: number | null; order_position: number | null; article_no: number | null; supplier_no: number | null; volume: number; baseline: number; target: number; gap_eur: number; run_id: number | null; order_date: string | null; action_type: string | null; status: string; draft_id: number | null; recommendation: Recommendation | null; detail: Record<string, unknown> | null }
export interface TaskRow { id: number; register_id: number | null; case_key: string; role: string; recipient_id: string | null; why: string; due_date: string; status: 'open' | 'done'; created_at: string }
export interface EventRow { id: number; created_at: string; case_key: string | null; register_id: number | null; event_type: string; message: string }
export interface OrderLine { order_no: number; order_position: number; order_date: string; supplier_no: number; supplier_name: string; article_no: number; description: string; plant: string; quantity: number; unit_price: number; spend: number; contract_no: string | null; buyer_no: string; payment_terms_p1: number | null; payment_terms_t3: number | null }
export interface DedupRow { period_start: string; period_end: string; gross: number; dedup: number }
export type Stats = Record<string, unknown>

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }
const num = <T extends object>(r: T, keys: (keyof T)[]): T => { const o = { ...r }; for (const k of keys) (o as Record<string, unknown>)[k as string] = toNumber(o[k]); return o }

export async function getCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase.from('mvp_cases').select('*').order('case_key')
  fail(error)
  return (data ?? []).map((r) => num(r as CaseRow, ['value_2026', 'rows', 'confidence']))
}

export async function setAgentEnabled(caseKey: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_agent_enabled', { p_case_key: caseKey, p_enabled: enabled })
  fail(error)
}

// Hard savings (one primary case per article plus terms), cost avoidance (Price Radar) and the gross sum, from the database.
export async function getSavingsSplit(period: Period): Promise<SavingsSplit | null> {
  const { data, error } = await supabase.from('v_savings_split').select('*').eq('period_start', period.from).eq('period_end', period.to).maybeSingle()
  fail(error)
  return data ? num(data as SavingsSplit, ['hard', 'cost_avoidance', 'gross', 'hard_contract_guard', 'hard_tier_guard', 'hard_preferred_steering', 'hard_terms_floor']) : null
}

export async function getOpenTasks(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('v_open_tasks').select('case_key,open')
  fail(error)
  return Object.fromEntries((data ?? []).map((r) => [r.case_key, toNumber(r.open)]))
}

export async function getConfig(): Promise<ConfigRow[]> {
  const { data, error } = await supabase.from('mvp_config').select('*').order('key')
  fail(error)
  return (data ?? []).map((r) => num(r as ConfigRow, ['value']))
}

export async function getStats(): Promise<Stats> {
  const { data, error } = await supabase.from('mvp_stats').select('*')
  fail(error)
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))
}

export async function getLatestRuns(period: Period): Promise<RunRow[]> {
  const { data, error } = await supabase.from('v_latest_runs').select('*').eq('period_start', period.from).eq('period_end', period.to)
  fail(error)
  return (data ?? []).map((r) => num(r as RunRow, ['rows', 'total', 'lines_checked']))
}

export async function getRunLog(limit = 5): Promise<RunRow[]> {
  const { data, error } = await supabase.from('agent_runs').select('*').order('id', { ascending: false }).limit(limit)
  fail(error)
  return (data ?? []).map((r) => num(r as RunRow, ['rows', 'total']))
}

export async function getEvents(limit = 10): Promise<EventRow[]> {
  const { data, error } = await supabase.from('mvp_events').select('*').order('id', { ascending: false }).limit(limit)
  fail(error)
  return (data ?? []) as EventRow[]
}

export async function setFindingStatus(registerId: number, status: string): Promise<void> {
  const { error } = await supabase.rpc('set_finding_status', { p_register_id: registerId, p_status: status })
  fail(error)
}

export async function getTasks(registerId: number): Promise<TaskRow[]> {
  const { data, error } = await supabase.from('mvp_tasks').select('*').eq('register_id', registerId).order('id')
  fail(error)
  return (data ?? []) as TaskRow[]
}

// Turns internal recipient number idx of a finding's recommendation into a task; idempotent in the database.
export async function createTask(registerId: number, idx: number): Promise<number> {
  const { data, error } = await supabase.rpc('create_task', { p_register_id: registerId, p_idx: idx })
  fail(error)
  return toNumber(data)
}

export async function runAgent(agent: string, period: Period): Promise<number> {
  const { data, error } = await supabase.rpc('run_agent', { p_agent: agent, p_start: period.from, p_end: period.to })
  fail(error)
  return toNumber(data)
}

export async function getRegister(runId: number, page: number, pageSize: number): Promise<{ rows: RegisterRow[]; count: number }> {
  const from = page * pageSize
  const { data, error, count } = await supabase.from('mvp_register').select('*', { count: 'exact' }).eq('run_id', runId).order('gap_eur', { ascending: false }).order('id').range(from, from + pageSize - 1)
  fail(error)
  const rows = (data ?? []).map((r) => num(r as RegisterRow, ['volume', 'baseline', 'target', 'gap_eur']))
  return { rows, count: count ?? rows.length }
}

// Findings of the latest runs for a period across agents, optionally only those that land on one internal role.
export async function getRegisterLatest(period: Period, agents: string[], role: string | null, page: number, pageSize: number): Promise<RegisterRow[]> {
  const from = page * pageSize
  let q = supabase.from('v_register_latest').select('*').eq('period_start', period.from).eq('period_end', period.to).in('agent', agents)
  if (role) q = q.filter('recommendation->internal', 'cs', JSON.stringify([{ role }]))
  const { data, error } = await q.order('gap_eur', { ascending: false }).order('id').range(from, from + pageSize - 1)
  fail(error)
  return (data ?? []).map((r) => num(r as RegisterRow, ['volume', 'baseline', 'target', 'gap_eur']))
}

export async function getRegisterTotals(period: Period, agents: string[], role: string | null): Promise<{ rows: number; total: number }> {
  const { data, error } = await supabase.rpc('register_totals', { p_start: period.from, p_end: period.to, p_agents: agents, p_role: role })
  fail(error)
  const r = (data as { rows: number; total: number }[] | null)?.[0]
  return { rows: toNumber(r?.rows), total: toNumber(r?.total) }
}

export interface ContractRow { contract_no: string; supplier_no: number; supplier_name: string; article_no: number; description: string; contract_price: number; paid: number; lines: number; volume: number; gap: number }
export interface BridgeRow { gross: number; financing: number; net: number; suppliers: number }
export interface IndexRow { year: number; articles_index: number; path_index: number; index_rate: number }

// Chart data per agent page, read from views over the run's own findings.
export async function getContractTable(runId: number): Promise<ContractRow[]> {
  const { data, error } = await supabase.from('v_contract_guard_contracts').select('*').eq('run_id', runId).order('gap', { ascending: false })
  fail(error)
  return (data ?? []).map((r) => num(r as ContractRow, ['contract_price', 'paid', 'lines', 'volume', 'gap']))
}

export async function getTermsBridge(runId: number): Promise<BridgeRow | null> {
  const { data, error } = await supabase.from('v_terms_floor_bridge').select('gross,financing,net,suppliers').eq('run_id', runId).maybeSingle()
  fail(error)
  return data ? num(data as BridgeRow, ['gross', 'financing', 'net', 'suppliers']) : null
}

export async function getPriceIndex(runId: number): Promise<IndexRow[]> {
  const { data, error } = await supabase.from('v_price_radar_index').select('year,articles_index,path_index,index_rate').eq('run_id', runId).order('year')
  fail(error)
  return (data ?? []).map((r) => num(r as IndexRow, ['articles_index', 'path_index', 'index_rate']))
}

export async function getDedup(period: Period): Promise<DedupRow | null> {
  const { data, error } = await supabase.from('v_dedup_total').select('*').eq('period_start', period.from).eq('period_end', period.to).maybeSingle()
  fail(error)
  return data ? num(data as DedupRow, ['gross', 'dedup']) : null
}

export const EVIDENCE_LIMIT = 200

// Order lines behind a finding in the period: by supplier and article, by article only (all suppliers), or by supplier only.
export async function getOrderLines(supplierNo: number | null, articleNo: number | null, period: Period): Promise<OrderLine[]> {
  let q = supabase.from('v_order_lines').select('order_no,order_position,order_date,supplier_no,supplier_name,article_no,description,plant,quantity,unit_price,spend,contract_no,buyer_no,payment_terms_p1,payment_terms_t3').gte('order_date', period.from).lte('order_date', period.to)
  if (supplierNo != null) q = q.eq('supplier_no', supplierNo)
  if (articleNo != null) q = q.eq('article_no', articleNo)
  const { data, error } = await q.order('order_date').order('order_no').limit(EVIDENCE_LIMIT)
  fail(error)
  return (data ?? []).map((r) => num(r as OrderLine, ['quantity', 'unit_price', 'spend']))
}

// Realtime: findings arriving in the register and runs closing. Returns the unsubscribe function.
export function subscribe(onRegister: (row: RegisterRow) => void, onRun: (row: RunRow) => void, onEvent?: (row: EventRow) => void): () => void {
  const channel = supabase.channel('live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mvp_events' }, (p) => onEvent?.(p.new as EventRow))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mvp_register' }, (p) => onRegister(num(p.new as RegisterRow, ['volume', 'baseline', 'target', 'gap_eur'])))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_runs' }, (p) => onRun(num(p.new as RunRow, ['rows', 'total', 'lines_checked'])))
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export interface DraftPayload { language: string; document_type: string; refused: boolean; refusal_reason: string; draft: { subject: string; salutation: string; body: string[]; closing: string }; claims_used: { claim: string; order_nos: string[] }[]; numbers_used: { value: string; unit: string; source_field: string }[]; confidence_note: string }
export interface DraftResponse { draft?: DraftPayload; draft_id?: number; cached?: boolean; created_at?: string; error?: string; reasons?: string[]; spent_usd?: number; usage?: { est_cost_usd: number; spent_usd: number } }

export async function draftAction(registerId: number, task: 'draft_supplier_message' | 'explain_for_cfo', force = false): Promise<DraftResponse> {
  const { data, error } = await supabase.functions.invoke<DraftResponse>('draft-action', { body: { register_id: registerId, task, force } })
  if (error && !data) {
    // non-2xx responses carry the JSON body in the error context
    const ctx = (error as { context?: Response }).context
    if (ctx) { try { return (await ctx.json()) as DraftResponse } catch { /* fall through */ } }
    throw new Error(error.message)
  }
  return data ?? {}
}

export async function getCachedDraft(registerId: number, task: string): Promise<{ id: number; payload: DraftPayload; created_at: string } | null> {
  const { data, error } = await supabase.from('mvp_drafts').select('id,payload,created_at').eq('register_id', registerId).eq('task', task).order('id', { ascending: false }).limit(1).maybeSingle()
  fail(error)
  return data as { id: number; payload: DraftPayload; created_at: string } | null
}
