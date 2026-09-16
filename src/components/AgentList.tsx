import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CaseRow, RunRow } from '../lib/data'
import { setAgentEnabled } from '../lib/data'
import { AGENTS, type CaseKey } from '../lib/agents'
import { formatEur, formatInt } from '../lib/format'
import { copy } from '../copy'
import { Switch } from './Switch'

// The agents as a compact list: name and purpose, value and findings for the period, on or off. Detail lives on the agent page.
export function AgentList({ cases, runs, search, onSwitched }: { cases: CaseRow[]; runs: RunRow[]; search: string; onSwitched: () => void }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {cases.map((row) => <AgentRow key={row.case_key} row={row} runs={runs} search={search} onSwitched={onSwitched} />)}
    </ul>
  )
}

function AgentRow({ row, runs, search, onSwitched }: { row: CaseRow; runs: RunRow[]; search: string; onSwitched: () => void }) {
  const layers = AGENTS[row.case_key as CaseKey]?.layers ?? [{ key: row.name, label: '' }]
  const main = runs.find((r) => r.case_name === layers[0].key)
  const [on, setOn] = useState(row.enabled)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setOn(row.enabled), [row.enabled])
  const toggle = async (next: boolean) => {
    setOn(next); setBusy(true); setError(null)   // optimistic, rolled back visibly if the database refuses
    try { await setAgentEnabled(row.case_key, next); onSwitched() } catch (e) { setOn(!next); setError((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <li data-testid={`agent-card-${row.case_key}`} data-enabled={on} className="grid items-center gap-x-6 gap-y-1 p-4 sm:grid-cols-[1fr_auto_auto]">
      <div className="min-w-0">
        <Link to={{ pathname: `/agents/${row.case_key}`, search }} className="rounded-sm text-base font-medium no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:text-text-muted">{row.name}</Link>
        <p data-testid="card-summary" className="text-sm text-text-muted">{row.summary}</p>
        {error && <p role="alert" className="text-xs text-danger-500">{copy.cockpit.switchError} {error}</p>}
      </div>
      <div className="sm:text-right">
        <p data-tabular className={`text-base font-semibold ${on ? '' : 'text-text-muted'}`}>{main ? formatEur(main.total) : copy.cockpit.notRun}</p>
        {main && <p data-tabular className="text-xs text-text-muted">{copy.reduced.findings(formatInt(main.rows))}</p>}
      </div>
      <Switch on={on} busy={busy} label={copy.cockpit.switchLabel(row.name)} onLabel={copy.cockpit.on} offLabel={copy.cockpit.off} onChange={toggle} testId={`switch-${row.case_key}`} />
    </li>
  )
}
