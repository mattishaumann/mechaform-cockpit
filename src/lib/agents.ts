// Agent registry: which cases the app shows and how. Adding an agent is one entry here plus its function, its mvp_cases row and a chart.
export type CaseKey = 'contract_guard' | 'tier_guard' | 'terms_floor' | 'price_radar' | 'preferred_steering'

export interface AgentConfig {
  key: CaseKey
  module: 'Compliance Intelligence' | 'Spend & Cost Intelligence' | 'Supplier Intelligence'
  layers?: { key: string; label: string }[]   // register cases that belong to this agent (default: the agent name)
  chart: 'contract_table' | 'tier_columns' | 'bridge' | 'indexed_line' | 'comparison_cards'   // the page's one chart
}

export const AGENTS: Record<CaseKey, AgentConfig> = {
  contract_guard: { key: 'contract_guard', module: 'Compliance Intelligence', chart: 'contract_table' },
  tier_guard: { key: 'tier_guard', module: 'Spend & Cost Intelligence', layers: [{ key: 'Tier Guard', label: 'Per order' }, { key: 'Tier Guard (annual volume)', label: 'Annual volume at top tier' }], chart: 'tier_columns' },
  terms_floor: { key: 'terms_floor', module: 'Compliance Intelligence', chart: 'bridge' },
  price_radar: { key: 'price_radar', module: 'Spend & Cost Intelligence', chart: 'indexed_line' },
  preferred_steering: { key: 'preferred_steering', module: 'Supplier Intelligence', chart: 'comparison_cards' },
}

const raw = (import.meta.env.VITE_ENABLED_AGENTS as string | undefined) ?? 'contract_guard,tier_guard,terms_floor,price_radar,preferred_steering'
export const enabledAgents: CaseKey[] = raw
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is CaseKey => s in AGENTS)
