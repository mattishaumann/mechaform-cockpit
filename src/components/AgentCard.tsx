import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CaseRow, CaseTotal } from '../lib/data'
import { AGENTS, type CaseKey } from '../lib/agents'
import { formatConfidence, formatEur, formatInt } from '../lib/format'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'

export function AgentCard({ row, totals }: { row: CaseRow; totals: CaseTotal[] }) {
  const [open, setOpen] = useState(false)
  const config = AGENTS[row.case_key as CaseKey]
  const layers = config?.layers?.slice(1).map((l) => ({ ...l, total: totals.find((t) => t.case === l.key) })) ?? []
  return (
    <article data-testid={`agent-card-${row.case_key}`} className="flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors duration-fast hover:border-border-strong">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Pill tone="brand">{config?.module ?? 'Agent'}</Pill>
          <h2 className="mt-3 text-lg font-semibold">{row.name}</h2>
        </div>
        <Button variant="ghost" aria-label={copy.cockpit.explain(row.name)} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="h-8 w-8 rounded-full border border-border-strong px-0 font-mono text-xs">
          {open ? 'x' : 'i'}
        </Button>
      </div>
      <p data-tabular className="mt-4 text-4xl font-semibold tracking-tight text-brand">{formatEur(row.value_2026)}</p>
      <p className="mt-1 text-sm text-text-muted">{formatInt(row.rows)} {copy.cockpit.rows}. {copy.cockpit.confidence(formatConfidence(row.confidence))}</p>
      {layers.map((l) => l.total && (
        <p key={l.key} className="mt-1 text-sm text-text-muted">Plus {formatEur(l.total.total)} on {formatInt(l.total.rows)} pairs, {l.label.toLowerCase()}</p>
      ))}
      {open && (
        <dl data-testid={`agent-explain-${row.case_key}`} className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
          {[[copy.agent.rule, row.rule], [copy.agent.evidence, row.evidence_required], [copy.agent.calculation, row.calculation], [copy.agent.action, row.customer_action], [copy.agent.trigger, row.trigger]].map(([k, v]) => (
            <div key={k}><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{k}</dt><dd className="mt-1">{v}</dd></div>
          ))}
        </dl>
      )}
      <div className="mt-auto pt-5">
        <Link to={`/agents/${row.case_key}`} className="inline-flex rounded-md bg-ink px-3 py-2 text-sm font-medium text-bg no-underline transition-colors duration-fast hover:bg-ink-hover active:scale-95">{copy.cockpit.open}</Link>
      </div>
    </article>
  )
}
