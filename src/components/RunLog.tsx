import type { RunRow } from '../lib/data'
import { formatEur, formatInt } from '../lib/format'
import { periodLabel } from '../lib/period'
import { copy } from '../copy'
import { Pill } from './Pill'

const time = (s: string | null) => (s ? new Date(s).toLocaleTimeString('en-GB') : '')
const seconds = (r: RunRow) => (r.finished_at ? `${((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)} s` : '')

export function RunLog({ runs }: { runs: RunRow[] }) {
  if (runs.length === 0) return <p data-testid="run-log" className="text-sm text-text-muted">{copy.runs.none}</p>
  return (
    <ol data-testid="run-log" className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
      {runs.map((r) => (
        <li key={r.id} data-status={r.status} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 sm:grid-cols-[1.4fr_1fr_auto_auto_auto]">
          <span className="font-medium">{r.case_name}</span>
          <span className="text-text-muted">{periodLabel({ from: r.period_start, to: r.period_end })}</span>
          <span className="hidden text-text-muted sm:inline">{formatInt(r.rows ?? 0)} {copy.cockpit.rows}</span>
          <span data-tabular className="hidden sm:inline">{formatEur(r.total ?? 0)}</span>
          <span className="flex items-center gap-2 text-text-muted"><Pill tone={r.status === 'done' ? 'positive' : 'brand'}>{r.status}</Pill><span className="hidden sm:inline">{time(r.finished_at)} {seconds(r)}</span></span>
        </li>
      ))}
    </ol>
  )
}
