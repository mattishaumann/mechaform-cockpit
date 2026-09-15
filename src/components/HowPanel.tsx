import { useState } from 'react'
import type { CaseRow, ConfigRow } from '../lib/data'
import { formatConfidence } from '../lib/format'
import { copy } from '../copy'
import { Button } from './Button'

// Fold-out explanation: closed by default, the dashboard stays a dashboard.
export function HowPanel({ row, params = [] }: { row: CaseRow; params?: ConfigRow[] }) {
  const [open, setOpen] = useState(false)
  const id = `how-${row.case_key}`
  return (
    <div className="mt-6">
      <Button variant="secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>{open ? copy.agent.howClose : copy.agent.how}</Button>
      {open && (
        <dl id={id} data-testid="how-panel" className="mt-3 grid gap-4 rounded-lg border border-border bg-surface p-5 text-sm md:grid-cols-2">
          {[[copy.agent.rule, row.rule], [copy.agent.evidence, row.evidence_required], [copy.agent.calculation, row.calculation], [copy.agent.action, row.customer_action], [copy.agent.trigger, row.trigger], ['Confidence', copy.cockpit.confidence(formatConfidence(row.confidence))]].map(([k, v]) => (
            <div key={k}><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{k}</dt><dd className="mt-1">{v}</dd></div>
          ))}
          {params.length > 0 && (
            <div data-testid="how-params" className="md:col-span-2">
              <dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.params}</dt>
              <dd className="mt-1">
                <ul className="space-y-1">
                  {params.map((c) => <li key={c.key}><span className="font-mono text-xs">{c.key}</span> <span data-tabular className="font-medium">{c.value}</span> {c.unit}: {c.label}{c.note ? ` (${c.note})` : ''}</li>)}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
