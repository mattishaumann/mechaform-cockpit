import { supabase } from './supabase'

export type ScenarioHow = 'draft' | 'task' | 'negotiation' | 'idea'

export interface Scenario {
  title: string
  benefit: string
  owner_role: string
  owner_id?: string
  how: ScenarioHow
  internal_idx?: number   // index into recommendation.internal for task and negotiation scenarios
  detail?: string[]
  value_eur?: number
  sample?: boolean        // built on the sample index (Index Guard)
}

export interface ScenarioSet {
  agent: string
  case: string
  object_label: string | null
  object_no: string | null
  supplier: string | null
  scenarios: Scenario[]
}

// Tacto's "Vorgeschlagene Szenarien" for one finding, built in SQL from the latest runs when the drawer opens
// (scenarios_for, spec mvp-agent-scenarios). Read-only: nothing is stored.
export async function getScenarios(registerId: number): Promise<ScenarioSet | null> {
  const { data, error } = await supabase.rpc('scenarios_for', { p_register_id: registerId })
  if (error) throw new Error(error.message)
  return (data ?? null) as ScenarioSet | null
}
