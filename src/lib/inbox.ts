// UI experiment "reduced": the recommended next steps, one per agent layer and supplier (view v_action_inbox).
import { supabase } from './supabase'
import { toNumber } from './format'
import type { Period } from './period'
import type { RegisterRow } from './data'

export interface InboxRow {
  agent: string; case_name: string; supplier_no: number; supplier_name: string | null; findings: number; articles: number; gap_eur: number
  top_register_id: number; title: string | null; rationale: string | null; document_type: string | null; sequence: string | null; role: string | null; role_id: string | null
}

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export async function getInbox(period: Period, limit: number, agent?: string): Promise<{ rows: InboxRow[]; count: number; total: number }> {
  let q = supabase.from('v_action_inbox').select('*', { count: 'exact' }).eq('period_start', period.from).eq('period_end', period.to)
  if (agent) q = q.eq('agent', agent)
  const { data, error, count } = await q.order('gap_eur', { ascending: false }).limit(limit)
  fail(error)
  const rows = (data ?? []).map((r) => ({ ...r, findings: toNumber(r.findings), articles: toNumber(r.articles), gap_eur: toNumber(r.gap_eur) })) as InboxRow[]
  // the rest line needs the sum over all rows; the list is small enough to sum on the gap column alone
  let all = supabase.from('v_action_inbox').select('gap_eur').eq('period_start', period.from).eq('period_end', period.to)
  if (agent) all = all.eq('agent', agent)
  const { data: gaps, error: e2 } = await all.limit(5000)
  fail(e2)
  return { rows, count: count ?? rows.length, total: (gaps ?? []).reduce((s, g) => s + toNumber(g.gap_eur), 0) }
}

export async function getRegisterRow(id: number): Promise<RegisterRow | null> {
  const { data, error } = await supabase.from('mvp_register').select('*').eq('id', id).maybeSingle()
  fail(error)
  return data ? ({ ...data, volume: toNumber(data.volume), baseline: toNumber(data.baseline), target: toNumber(data.target), gap_eur: toNumber(data.gap_eur) } as RegisterRow) : null
}

// "Contract Guard empfiehlt Nachbelastung" -> "Nachbelastung": the action leads, the agent moves to the meta line
export const actionOf = (r: InboxRow) => (r.title?.split(' empfiehlt ')[1] ?? r.title ?? r.case_name)
