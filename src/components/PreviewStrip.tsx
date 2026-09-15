import { Link } from 'react-router-dom'
import type { CaseRow, RunRow } from '../lib/data'
import { previewAgents } from '../lib/agents'
import { formatEur, formatInt } from '../lib/format'
import { copy } from '../copy'
import { Pill } from './Pill'

// Preview agents sit under the strategy cards: visible and runnable, never counted in the totals or among the five cards.
export function PreviewStrip({ cases, runs, search }: { cases: CaseRow[]; runs: RunRow[]; search: string }) {
  const rows = previewAgents.map((k) => cases.find((c) => c.case_key === k)).filter((c): c is CaseRow => Boolean(c))
  if (rows.length === 0) return null
  return (
    <div className="mt-6 space-y-3">
      {rows.map((row) => {
        const run = runs.find((r) => r.case_name === row.name)
        return (
          <article key={row.case_key} data-testid={`preview-card-${row.case_key}`} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-border-strong bg-surface p-5">
            <div className="max-w-prose">
              <div className="flex flex-wrap items-center gap-2"><Pill tone="neutral">{copy.index.previewLabel}</Pill><Pill tone="brand">{copy.index.samplePill}</Pill></div>
              <h2 className="mt-3 text-lg font-semibold">{row.name}</h2>
              <p className="mt-1 text-sm text-text-muted">{copy.index.previewText}</p>
              <p data-testid="preview-value" data-tabular className="mt-2 text-sm">{run ? copy.index.previewValue(formatEur(run.total), formatInt(run.rows)) : copy.index.previewNotRun}</p>
            </div>
            <Link to={{ pathname: `/agents/${row.case_key}`, search }} className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium no-underline transition-colors duration-fast hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:bg-bg">{copy.index.previewOpen}</Link>
          </article>
        )
      })}
    </div>
  )
}
