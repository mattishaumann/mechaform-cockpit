import { supabase } from './supabase'
import { toNumber } from './format'
import type { Period } from './period'

export interface CaseRow { case_key: string; name: string; trigger: string; rule: string; inputs: string[]; evidence_required: string; customer_action: string; example: Record<string, unknown>; calculation: string; value_2026: number; rows: number; confidence: number }
export interface RunRow { id: number; agent: string; case_name: string; period_start: string; period_end: string; started_at: string; finished_at: string | null; status: string; rows: number; total: number; lines_checked: number | null }
export interface Recipient { role: string; id: string | null; plant?: string; why: string; how: 'task'; due_days: number }
export interface Recommendation { internal: Recipient[]; external: { recipient: string; document_type: string; how: 'email_draft' } | null; sequence: 'internal_first' | 'external_first' | 'internal_only'; rationale: string }
export interface RegisterRow { id: number; case: string; order_no: number | null; order_position: number | null; article_no: number | null; supplier_no: number | null; volume: number; baseline: number; target: number; gap_eur: number; run_id: number | null; order_date: string | null; action_type: string | null; status: string; draft_id: number | null; recommendation: Recommendation | null }
export interface TaskRow { id: number; register_id: number | null; case_key: string; role: string; recipient_id: string | null; why: string; due_date: string; status: 'open' | 'done'; created_at: string }
export interface EventRow { id: number; created_at: string; case_key: string | null; register_id: number | null; event_type: string; message: string }
export interface OrderLine { order_no: number; order_position: number; order_date: string; supplier_no: number; supplier_name: string; article_no: number; description: string; plant: string; quantity: number; unit_price: number; spend: number; contract_no: string | null; buyer_no: string }
export interface TrendRow { run_id: number; month: string; rows: number; total: number }
export interface DedupRow { period_start: string; period_end: string; gross: number; dedup: number }
export type Stats = Record<string, unknown>

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }
const num = <T extends object>(r: T, keys: (keyof T)[]): T => { const o = { ...r }; for (const k of keys) (o as Record<string, unknown>)[k as string] = toNumber(o[k]); return o }

export async function getCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase.from('mvp_cases').select('*').order('case_key')
  fail(error)
  return (data ?? []).map((r) => num(r as CaseRow, ['value_2026', 'rows', 'confidence']))
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

export async function getTrend(runId: number): Promise<TrendRow[]> {
  const { data, error } = await supabase.from('v_agent_trend').select('*').eq('run_id', runId).order('month')
  fail(error)
  return (data ?? []).map((r) => num(r as TrendRow, ['rows', 'total']))
}

export async function getDedup(period: Period): Promise<DedupRow | null> {
  const { data, error } = await supabase.from('v_dedup_total').select('*').eq('period_start', period.from).eq('period_end', period.to).maybeSingle()
  fail(error)
  return data ? num(data as DedupRow, ['gross', 'dedup']) : null
}

export async function getOrderLines(supplierNo: number, articleNo: number, period: Period): Promise<OrderLine[]> {
  const { data, error } = await supabase.from('v_order_lines').select('order_no,order_position,order_date,supplier_no,supplier_name,article_no,description,plant,quantity,unit_price,spend,contract_no,buyer_no').eq('supplier_no', supplierNo).eq('article_no', articleNo).gte('order_date', period.from).lte('order_date', period.to).order('order_date')
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
