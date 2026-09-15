// Index Guard (preview agent, spec mvp-index-guard): data access and register columns.
// The index data is SAMPLE until a real feed is loaded; every screen that shows it says so.
import { supabase } from './supabase'
import { formatPct, formatPrice, toNumber } from './format'
import type { RegisterRow } from './data'
import { columns, type Column } from '../components/RegisterTable'
import { copy } from '../copy'

export interface IndexSummaryRow { run_id: number; category_no: string; category_name: string | null; month: string; spend: number; paid_index: number; basket_index: number; lines: number }
export interface IndexDefinition { index_code: string; name: string; stands_in_for: string | null; unit: string | null; source: string | null; is_sample: boolean }
export interface IndexPoint { index_code: string; month: string; value: number }
export interface BasketWeight { category_no: string; material_type: string; component: string; weight: number; note: string | null }

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export async function getIndexSummary(runId: number): Promise<IndexSummaryRow[]> {
  const { data, error } = await supabase.from('v_index_guard_summary').select('*').eq('run_id', runId).order('month')
  fail(error)
  return (data ?? []).map((r) => ({ ...r, spend: toNumber(r.spend), paid_index: toNumber(r.paid_index), basket_index: toNumber(r.basket_index), lines: toNumber(r.lines) })) as IndexSummaryRow[]
}

export async function getIndexData(): Promise<{ definitions: IndexDefinition[]; series: IndexPoint[]; baskets: BasketWeight[] }> {
  const [d, s, b] = await Promise.all([
    supabase.from('index_definitions').select('*').order('index_code'),
    supabase.from('index_series').select('index_code,month,value').order('month').limit(5000),
    supabase.from('category_index_map').select('*').order('category_no'),
  ])
  fail(d.error); fail(s.error); fail(b.error)
  return {
    definitions: (d.data ?? []) as IndexDefinition[],
    series: (s.data ?? []).map((r) => ({ ...r, value: toNumber(r.value) })) as IndexPoint[],
    baskets: (b.data ?? []).map((r) => ({ ...r, weight: toNumber(r.weight) })) as BasketWeight[],
  }
}

const det = (r: RegisterRow, k: string): unknown => (r.detail ?? {})[k]
const pct = (r: RegisterRow, k: string) => (det(r, k) == null ? '' : `${toNumber(det(r, k)) >= 0 ? '+' : ''}${formatPct(det(r, k), 1)}`)

const ig = {
  indexPrice: { key: 'indexPrice', label: copy.index.indexPrice, render: (r: RegisterRow) => formatPrice(det(r, 'index_price')), align: 'right' as const },
  ceiling: { key: 'ceiling', label: copy.index.ceiling, render: (r: RegisterRow) => formatPrice(r.target), align: 'right' as const },
  priceChange: { key: 'priceChange', label: copy.index.priceChange, render: (r: RegisterRow) => pct(r, 'price_change'), align: 'right' as const },
  indexChange: { key: 'indexChange', label: copy.index.indexChange, render: (r: RegisterRow) => pct(r, 'index_change'), align: 'right' as const },
  deviation: { key: 'deviation', label: copy.index.deviation, render: (r: RegisterRow) => pct(r, 'deviation'), align: 'right' as const },
  contract: { key: 'contract', label: copy.index.contract, render: (r: RegisterRow) => String(det(r, 'contract_no') ?? '') },
} satisfies Record<string, Column>

export const indexLayerColumns: Record<string, Column[]> = {
  'Index Guard': [columns.order, columns.date, columns.article, columns.supplier, columns.quantity, columns.paid, ig.indexPrice, ig.priceChange, ig.indexChange, ig.deviation, columns.gap, ig.contract, columns.status],
  'Index Guard (contracts)': [ig.contract, columns.article, columns.supplier, columns.volume, columns.baseline, ig.indexPrice, ig.priceChange, ig.indexChange, ig.deviation, columns.gap, columns.status],
}
