// Negotiation trainer (preview): the stored session replays from the database; one live turn goes through trainer-turn.
import { supabase } from './supabase'
import { toNumber } from './format'

const num = <T extends object>(r: T, keys: (keyof T)[]): T => { const o = { ...r }; for (const k of keys) (o as Record<string, unknown>)[k as string] = toNumber(o[k]); return o }

export const TRAINER = { supplierNo: 3000742, from: '2026-01-01', to: '2026-12-31' }   // Getriebebau Arnold, calendar 2026

export interface Contact { honorific: string; first_name: string; last_name: string; full_name: string; role: string; initials: string }

export interface Candidate { supplier_no: number; supplier_name: string; gap: number; lines: number; articles: number; deviation: number; free_spend: number; free_articles: number; has_contract_elsewhere: boolean; spend: number; first_order: string; years_active: number; spend_all_years: number; why: string; opening: string }
export interface SupplierHit { supplier_no: number; supplier_name: string; spend: number; order_lines: number; years_active: number }
export interface SupplierHistory { supplier_name: string; city: string | null; country: string | null; supplier_status: string; public_website_url: string | null; spend: number; order_lines: number; orders: number; articles: number; on_time: number | null; buyers: string; categories: string | null; first_order: string; last_order: string; years_active: number; spend_all_years: number }
export interface BriefFact { fact_id: string; case_name: string | null; fact: string; value: number }
export interface SupplierReply { message: string; concession: 'none' | 'partial' | 'full'; numbers_used: { value: string; source: string }[] }
export interface CoachCard { assessment: 'strong' | 'ok' | 'weak'; note: string; next_fact_id: string; used_fact_ids: string[] }
export interface Turn { id: number; session_id: number; turn_no: number; buyer: string; supplier: SupplierReply; coach: CoachCard }
export interface TurnResponse { turn?: Turn; error?: string; reasons?: string[] }

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

// The three negotiation cases: prices furthest above the cost index basket where nothing is agreed yet
export async function getCandidates(limit = 3): Promise<Candidate[]> {
  const { data, error } = await supabase.rpc('negotiation_candidates', { p_start: TRAINER.from, p_end: TRAINER.to, p_limit: limit })
  fail(error)
  return ((data ?? []) as Candidate[]).map((r) => num(r, ['supplier_no', 'gap', 'lines', 'articles', 'deviation', 'free_spend', 'free_articles', 'spend', 'years_active', 'spend_all_years']))
}

// Target any supplier instead of the three recommended ones
export async function searchSuppliers(query: string): Promise<SupplierHit[]> {
  const { data, error } = await supabase.rpc('search_suppliers', { p_query: query, p_start: TRAINER.from, p_end: TRAINER.to, p_limit: 8 })
  fail(error)
  return ((data ?? []) as SupplierHit[]).map((r) => num(r, ['supplier_no', 'spend', 'order_lines', 'years_active']))
}

// The suggested first message for a supplier that is not one of the three: built in SQL from what the period knows
export async function getOpening(supplierNo: number): Promise<string> {
  const { data, error } = await supabase.rpc('supplier_opening', { p_supplier: supplierNo, p_start: TRAINER.from, p_end: TRAINER.to })
  fail(error)
  return (data as string | null) ?? ''
}

export async function getSupplierHistory(supplierNo: number): Promise<SupplierHistory | null> {
  const { data, error } = await supabase.rpc('supplier_history', { p_supplier: supplierNo, p_start: TRAINER.from, p_end: TRAINER.to })
  fail(error)
  const row = (data as SupplierHistory[] | null)?.[0]
  return row ? num(row, ['spend', 'order_lines', 'orders', 'articles', 'on_time', 'years_active', 'spend_all_years']) : null
}

export async function startTrainerSession(supplierNo: number): Promise<number> {
  const { data, error } = await supabase.rpc('start_trainer_session', { p_supplier_no: supplierNo, p_start: TRAINER.from, p_end: TRAINER.to })
  fail(error)
  return toNumber(data)
}

export async function getStoredSession(): Promise<{ id: number; supplier_name: string } | null> {
  const { data, error } = await supabase.from('mvp_trainer_sessions').select('id').eq('kind', 'stored').eq('supplier_no', TRAINER.supplierNo).eq('period_start', TRAINER.from).eq('period_end', TRAINER.to).maybeSingle()
  fail(error)
  if (!data) return null
  const { data: s, error: e2 } = await supabase.from('suppliers').select('name').eq('supplier_no', TRAINER.supplierNo).maybeSingle()
  fail(e2)
  return { id: data.id as number, supplier_name: (s?.name as string) ?? String(TRAINER.supplierNo) }
}

export async function getTurns(sessionId: number): Promise<Turn[]> {
  const { data, error } = await supabase.from('mvp_trainer_turns').select('*').eq('session_id', sessionId).order('turn_no')
  fail(error)
  return (data ?? []) as Turn[]
}

export async function getBrief(supplierNo: number = TRAINER.supplierNo): Promise<BriefFact[]> {
  const { data, error } = await supabase.from('v_supplier_brief').select('fact_id,case_name,fact,value').eq('supplier_no', supplierNo).eq('period_start', TRAINER.from).eq('period_end', TRAINER.to)
  fail(error)
  const order = ['spend', 'index_guard', 'contract_guard', 'contract_guard_top', 'tier_guard', 'terms_floor', 'preferred_steering', 'contracts_end']
  const rank = (id: string) => { const i = order.findIndex((o) => id === o || id.startsWith(`${o}_`)); return i < 0 ? order.length : i }
  return ((data ?? []) as BriefFact[]).map((f) => ({ ...f, value: toNumber(f.value) })).sort((a, b) => rank(a.fact_id) - rank(b.fact_id) || a.fact_id.localeCompare(b.fact_id))
}

export async function startLiveSession(parentId: number): Promise<number> {
  const { data, error } = await supabase.rpc('start_live_session', { p_parent: parentId })
  fail(error)
  return toNumber(data)
}

export async function sendTurn(sessionId: number, message: string): Promise<TurnResponse> {
  const { data, error } = await supabase.functions.invoke<TurnResponse>('trainer-turn', { body: { session_id: sessionId, buyer_message: message } })
  if (error && !data) {
    const ctx = (error as { context?: Response }).context   // non-2xx responses carry the JSON body in the error context
    if (ctx) { try { return (await ctx.json()) as TurnResponse } catch { /* fall through */ } }
    return { error: error.message }
  }
  return data ?? {}
}

// The person on the other side of the practice conversation, invented per supplier in SQL and labelled as invented.
export async function getSupplierContact(supplierNo: number): Promise<Contact | null> {
  const { data, error } = await supabase.rpc('supplier_contact', { p_supplier: supplierNo })
  if (error) throw new Error(error.message)
  return ((data ?? [])[0] as Contact) ?? null
}
