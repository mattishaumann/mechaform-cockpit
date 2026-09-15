import { supabase } from './supabase'
import { toNumber } from './format'

// External Price Benchmark (spec mvp-price-benchmark): one register row per sample article. The detail carries the seed item
// as researched (part guess, evidence, benchmark, targets, actions) and the run's 2026 figures and savings range.
export type BenchmarkCase = 'supplier_change' | 'brand_substitution' | 'price_confirmed'

export interface BenchmarkSupplier { supplier_no: number; name: string; country: string | null; qty: number; avg_price: number }

export interface BenchmarkItem {
  id: number
  article_no: number
  description: string
  category: string
  identified_part: string
  identification_type: string
  alternatives: string[]
  evidence: string
  identification_confidence: string
  benchmark: { price_eur: string; price_type: string; source_name: string; source_url: string }
  target_price_low_case_eur: number | null
  target_price_high_case_eur: number | null
  price_comparability: string
  case_type: BenchmarkCase
  actions: string[]
  qty: number
  avg_price: number
  suppliers: BenchmarkSupplier[]
  savings_low: number
  savings_high: number
  gap_pct: number | null
  bench_ref: number | null
  below_benchmark_pct: number | null
  researched_on: string
}

export interface BenchmarkSummary { run_id: number; items: number; savings_low: number; savings_high: number; researched_on: string; article_universe: number }

const NUM = ['qty', 'avg_price', 'savings_low', 'savings_high', 'target_price_low_case_eur', 'target_price_high_case_eur', 'gap_pct', 'bench_ref', 'below_benchmark_pct'] as const

// the run's findings, highest high case first
export async function getBenchmarkItems(runId: number): Promise<BenchmarkItem[]> {
  const { data, error } = await supabase.from('mvp_register').select('id,article_no,detail').eq('run_id', runId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const d = { ...(r.detail as Record<string, unknown>) }
    for (const k of NUM) d[k] = d[k] == null ? null : toNumber(d[k])
    return { ...d, id: r.id, article_no: toNumber(r.article_no) } as unknown as BenchmarkItem
  }).sort((a, b) => b.savings_high - a.savings_high)
}

export async function getBenchmarkSummary(runId: number): Promise<BenchmarkSummary | null> {
  const { data, error } = await supabase.from('v_price_benchmark_summary').select('*').eq('run_id', runId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { ...data, items: toNumber(data.items), savings_low: toNumber(data.savings_low), savings_high: toNumber(data.savings_high), article_universe: toNumber(data.article_universe) } as BenchmarkSummary
}

// "€1.8M" for the headline range; the cards keep whole euros
export const formatMillions = (v: number): string => `€${(v / 1e6).toFixed(1)}M`
