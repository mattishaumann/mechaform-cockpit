// Negotiation trainer (preview): the stored session replays from the database; one live turn goes through trainer-turn.
import { supabase } from './supabase'
import { toNumber } from './format'

export const TRAINER = { supplierNo: 3000742, from: '2026-01-01', to: '2026-12-31' }   // Getriebebau Arnold, calendar 2026

export interface BriefFact { fact_id: string; case_name: string | null; fact: string; value: number }
export interface SupplierReply { message: string; concession: 'none' | 'partial' | 'full'; numbers_used: { value: string; source: string }[] }
export interface CoachCard { assessment: 'strong' | 'ok' | 'weak'; note: string; next_fact_id: string; used_fact_ids: string[] }
export interface Turn { id: number; session_id: number; turn_no: number; buyer: string; supplier: SupplierReply; coach: CoachCard }
export interface TurnResponse { turn?: Turn; error?: string; reasons?: string[] }

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

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

export async function getBrief(): Promise<BriefFact[]> {
  const { data, error } = await supabase.from('v_supplier_brief').select('fact_id,case_name,fact,value').eq('supplier_no', TRAINER.supplierNo).eq('period_start', TRAINER.from).eq('period_end', TRAINER.to)
  fail(error)
  const order = ['spend', 'contract_guard', 'contract_guard_top', 'tier_guard', 'terms_floor', 'preferred_steering', 'contracts_end']
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
