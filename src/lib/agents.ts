// Agent registry: which cases the app shows and how. Adding an agent is one entry here plus its function, its mvp_cases row and a chart.
export type CaseKey = 'contract_guard' | 'tier_guard' | 'terms_floor' | 'index_guard' | 'price_benchmark'

export interface AgentConfig {
  key: CaseKey
  module: 'Compliance Intelligence' | 'Spend & Cost Intelligence' | 'Supplier Intelligence' | 'Sourcing Intelligence'
  layers?: { key: string; label: string }[]   // register cases that belong to this agent (default: the agent name)
  chart: 'contract_table' | 'tier_columns' | 'bridge' | 'index_basket' | 'benchmark_cards'   // the page's one chart
}

export const AGENTS: Record<CaseKey, AgentConfig> = {
  contract_guard: { key: 'contract_guard', module: 'Compliance Intelligence', chart: 'contract_table' },
  tier_guard: { key: 'tier_guard', module: 'Spend & Cost Intelligence', layers: [{ key: 'Tier Guard', label: 'Per order' }, { key: 'Tier Guard (annual volume)', label: 'Annual volume at top tier' }], chart: 'tier_columns' },
  terms_floor: { key: 'terms_floor', module: 'Compliance Intelligence', chart: 'bridge' },
  // preview agent (spec mvp-index-guard): prices against a cost index basket; runs on SAMPLE index data until a feed is loaded
  index_guard: { key: 'index_guard', module: 'Spend & Cost Intelligence', layers: [{ key: 'Index Guard', label: 'Per order line' }, { key: 'Index Guard (contracts)', label: 'Per contract position' }], chart: 'index_basket' },
  // flagship preview agent (spec mvp-price-benchmark): the real part behind an article against public web prices; a sample of 4 articles
  price_benchmark: { key: 'price_benchmark', module: 'Sourcing Intelligence', chart: 'benchmark_cards' },
}

const raw = (import.meta.env.VITE_ENABLED_AGENTS as string | undefined) ?? 'contract_guard,tier_guard,terms_floor'
export const enabledAgents: CaseKey[] = raw
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is CaseKey => s in AGENTS)

// Preview agents: reachable from the navigation and a cockpit strip, never counted among the strategy cards or the totals.
const rawPreview = (import.meta.env.VITE_PREVIEW_AGENTS as string | undefined) ?? 'price_benchmark,index_guard'
export const previewAgents: CaseKey[] = rawPreview
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is CaseKey => s in AGENTS && !enabledAgents.includes(s as CaseKey))

