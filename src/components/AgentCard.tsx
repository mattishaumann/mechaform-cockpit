import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CaseRow, RunRow } from '../lib/data'
import { AGENTS, type CaseKey } from '../lib/agents'
import { formatConfidence, formatEur, formatInt } from '../lib/format'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'

// One card per agent. Value and rows come from the latest run for the selected period; the explanation folds out.
export function AgentCard({ row, runs, search }: { row: CaseRow; runs: RunRow[]; search: string }) {
  const [open, setOpen] = useState(false)
  const config = AGENTS[row.case_key as CaseKey]
  const layers = config?.layers ?? [{ key: row.name, label: '' }]
  const main = runs.find((r) => r.case_name === layers[0].key)
  const extra = layers.slice(1).map((l) => ({ ...l, run: runs.find((r) => r.case_name === l.key) })).filter((l) => l.run)
  return (
    <article data-testid={`agent-card-${row.case_key}`} className="flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors duration-fast hover:border-border-strong">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Pill tone="brand">{config?.module ?? 'Agent'}</Pill>
          <h2 className="mt-3 text-lg font-semibold">{row.name}</h2>
        </div>
        <Button variant="ghost" aria-label={copy.cockpit.explain(row.name)} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="h-8 w-8 rounded-full border border-border-strong px-0 font-mono text-xs">{open ? 'x' : 'i'}</Button>
      </div>
      {main ? (
        <>
          <p data-tabular className="mt-4 text-4xl font-semibold tracking-tight text-brand">{formatEur(main.total)}</p>
          <p className="mt-1 text-sm text-text-muted">{formatInt(main.rows)} {copy.cockpit.rows}. {copy.cockpit.confidence(formatConfidence(row.confidence))}</p>
          <p data-testid={`run-detail-${row.case_key}`} className="mt-1 font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.lastRun} {main.finished_at ? new Date(main.finished_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}, {formatInt(main.lines_checked ?? 0)} {copy.finding.linesChecked}, {formatInt(main.rows)} {copy.finding.flagged}</p>
          {extra.map((l) => <p key={l.key} className="mt-1 text-sm text-text-muted">Plus {formatEur(l.run!.total)} on {formatInt(l.run!.rows)} pairs, {l.label.toLowerCase()}</p>)}
        </>
      ) : (
        <p className="mt-4 text-sm text-text-muted">{copy.cockpit.notRun}</p>
      )}
      {open && (
        <dl data-testid={`agent-explain-${row.case_key}`} className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          {[[copy.agent.rule, row.rule], [copy.agent.evidence, row.evidence_required], [copy.agent.calculation, row.calculation], [copy.agent.action, row.customer_action], [copy.agent.trigger, row.trigger]].map(([k, v]) => (
            <div key={k}><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{k}</dt><dd className="mt-1">{v}</dd></div>
          ))}
        </dl>
      )}
      <div className="mt-auto pt-5">
        <Link to={{ pathname: `/agents/${row.case_key}`, search }} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none inline-flex rounded-md bg-ink px-3 py-2 text-sm font-medium text-bg no-underline transition-colors duration-fast hover:bg-ink-hover active:scale-95">{copy.cockpit.open}</Link>
      </div>
    </article>
  )
}
