import { supabase } from './supabase'
import { toNumber } from './format'

export interface CaseRow {
  case_key: string
  name: string
  trigger: string
  rule: string
  inputs: string[]
  evidence_required: string
  customer_action: string
  example: Record<string, unknown>
  calculation: string
  value_2026: number
  rows: number
  confidence: number
}
export interface CaseTotal { case: string; rows: number; total: number }
export interface RegisterRow { id: number; case: string; order_no: number | null; article_no: number | null; supplier_no: number | null; volume: number; baseline: number; target: number; gap_eur: number }
export interface OrderLine { order_no: number; order_position: number; order_date: string; supplier_no: number; supplier_name: string; article_no: number; description: string; plant: string; quantity: number; unit_price: number; spend: number; contract_no: string | null; buyer_no: string }
export type Stats = Record<string, unknown>

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export async function getCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase.from('mvp_cases').select('*').order('case_key')
  fail(error)
  return (data ?? []).map((r) => ({ ...r, value_2026: toNumber(r.value_2026), rows: toNumber(r.rows), confidence: toNumber(r.confidence) })) as CaseRow[]
}

export async function getCaseTotals(): Promise<CaseTotal[]> {
  const { data, error } = await supabase.from('v_case_totals').select('*')
  fail(error)
  return (data ?? []).map((r) => ({ case: r.case, rows: toNumber(r.rows), total: toNumber(r.total) }))
}

export async function getStats(): Promise<Stats> {
  const { data, error } = await supabase.from('mvp_stats').select('*')
  fail(error)
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))
}

export async function getRegister(caseName: string, page: number, pageSize: number): Promise<{ rows: RegisterRow[]; count: number }> {
  const from = page * pageSize
  const { data, error, count } = await supabase.from('mvp_register').select('*', { count: 'exact' }).eq('case', caseName).order('gap_eur', { ascending: false }).order('id').range(from, from + pageSize - 1)
  fail(error)
  const rows = (data ?? []).map((r) => ({ ...r, volume: toNumber(r.volume), baseline: toNumber(r.baseline), target: toNumber(r.target), gap_eur: toNumber(r.gap_eur) })) as RegisterRow[]
  return { rows, count: count ?? rows.length }
}

export async function getOrderLines(supplierNo: number, articleNo: number, year = 2026): Promise<OrderLine[]> {
  const { data, error } = await supabase.from('v_order_lines').select('order_no,order_position,order_date,supplier_no,supplier_name,article_no,description,plant,quantity,unit_price,spend,contract_no,buyer_no').eq('supplier_no', supplierNo).eq('article_no', articleNo).eq('year', year).order('order_date')
  fail(error)
  return (data ?? []).map((r) => ({ ...r, quantity: toNumber(r.quantity), unit_price: toNumber(r.unit_price), spend: toNumber(r.spend) })) as OrderLine[]
}
