import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CaseRow, RunRow } from '../lib/data'
import { setAgentEnabled } from '../lib/data'
import { AGENTS, type CaseKey } from '../lib/agents'
import { formatConfidence, formatEur, formatInt } from '../lib/format'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'
import { Switch } from './Switch'

const stamp = (s: string) => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Strategy card in Tacto's pattern: module, name, what the agent does in one sentence, its value for the period, run detail,
// open tasks and the on/off switch. Value and rows come from the latest run for the selected period.
export function AgentCard({ row, runs, search, openTasks, onSwitched }: { row: CaseRow; runs: RunRow[]; search: string; openTasks: number; onSwitched: () => void }) {
  const config = AGENTS[row.case_key as CaseKey]
  const layers = config?.layers ?? [{ key: row.name, label: '' }]
  const main = runs.find((r) => r.case_name === layers[0].key)
  const extra = layers.slice(1).map((l) => ({ ...l, run: runs.find((r) => r.case_name === l.key) })).filter((l) => l.run)
  const [on, setOn] = useState(row.enabled)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [explain, setExplain] = useState(false)
  useEffect(() => setOn(row.enabled), [row.enabled])

  const toggle = async (next: boolean) => {
    setOn(next); setBusy(true); setError(null)   // optimistic, rolled back below if the database refuses
    try { await setAgentEnabled(row.case_key, next); onSwitched() } catch (e) { setOn(!next); setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <article data-testid={`agent-card-${row.case_key}`} data-enabled={on} className="flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors duration-fast hover:border-border-strong">
      <div><Pill tone={on ? 'brand' : 'neutral'}>{config?.module ?? 'Agent'}</Pill></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{row.name}</h2>
        <Switch on={on} busy={busy} label={copy.cockpit.switchLabel(row.name)} onLabel={copy.cockpit.on} offLabel={copy.cockpit.off} onChange={toggle} testId={`switch-${row.case_key}`} />
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-danger-500">{copy.cockpit.switchError} {error}</p>}
      <p data-testid="card-summary" className="mt-1 text-sm text-text-muted">{row.summary}</p>
      {explain && (
        <dl data-testid={`agent-explain-${row.case_key}`} className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          {[[copy.agent.rule, row.rule], [copy.agent.evidence, row.evidence_required], [copy.agent.calculation, row.calculation], [copy.agent.action, row.customer_action], [copy.agent.trigger, row.trigger]].map(([k, v]) => (
            <div key={k}><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{k}</dt><dd className="mt-1">{v}</dd></div>
          ))}
        </dl>
      )}
      {main ? (
        <>
          <p data-tabular className={`mt-4 text-4xl font-semibold tracking-tight ${on ? 'text-brand' : 'text-text-muted'}`}>{formatEur(main.total)}</p>
          <p className="mt-1 text-sm text-text-muted">{formatInt(main.rows)} {copy.cockpit.rows}. {copy.cockpit.confidence(formatConfidence(row.confidence))}</p>
          {extra.map((l) => <p key={l.key} className="mt-1 text-sm text-text-muted">Plus {formatEur(l.run!.total)} on {formatInt(l.run!.rows)} pairs, {l.label.toLowerCase()}</p>)}
          <p data-testid={`run-detail-${row.case_key}`} className="mt-3 font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.lastRun} {main.finished_at ? stamp(main.finished_at) : ''}, {formatInt(main.lines_checked ?? 0)} {copy.finding.linesChecked}, {formatInt(main.rows)} {copy.finding.flagged}</p>
        </>
      ) : (
        <p className="mt-4 text-sm text-text-muted">{copy.cockpit.notRun}</p>
      )}
      {!on && <p className="mt-2 text-sm text-text-muted">{copy.cockpit.offNote}</p>}
      <div className="mt-3"><span data-testid="open-tasks" data-count={openTasks}><Pill tone={openTasks > 0 ? 'brand' : 'neutral'}>{copy.cockpit.openTasks(openTasks)}</Pill></span></div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <div className="flex items-center gap-2">
          <Link to={{ pathname: `/agents/${row.case_key}`, search }} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none inline-flex rounded-md bg-ink px-3 py-2 text-sm font-medium text-bg no-underline transition-colors duration-fast hover:bg-ink-hover active:scale-95">{copy.cockpit.open}</Link>
          <Button variant="ghost" aria-label={copy.cockpit.explain(row.name)} aria-expanded={explain} onClick={() => setExplain((o) => !o)} className="h-8 w-8 rounded-full border border-border-strong px-0 font-mono text-xs">{explain ? 'x' : 'i'}</Button>
        </div>
      </div>
    </article>
  )
}
