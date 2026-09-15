import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CaseRow, RunRow } from '../lib/data'
import { runAgent } from '../lib/data'
import { AGENTS, type CaseKey } from '../lib/agents'
import type { Period } from '../lib/period'
import { formatMillions, getBenchmarkSummary } from '../lib/priceBenchmark'
import { useQuery } from '../lib/useQuery'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'

const b = copy.benchmark
const stamp = (s: string) => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// The flagship with the agents: same parts as a strategy card (module, name, one sentence, value, last run, run), set apart
// by the brand edge and its four-step pipeline. Its value is the sample's range with the low-confidence badge, never a total.
export function FlagshipCard({ row, runs, period, search, onRun }: { row: CaseRow; runs: RunRow[]; period: Period; search: string; onRun: () => void }) {
  const run = runs.find((r) => r.case_name === row.name)
  const q = useQuery(() => (run ? getBenchmarkSummary(run.id) : Promise.resolve(null)), [run?.id])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const s = q.data
  const go = async () => {
    setRunning(true); setError(null)
    try { await runAgent(row.case_key, period); onRun() } catch (e) { setError((e as Error).message) } finally { setRunning(false) }
  }
  return (
    <article data-testid={`flagship-card-${row.case_key}`} className="mt-6 rounded-lg border border-brand bg-surface p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="brand">{AGENTS[row.case_key as CaseKey]?.module ?? 'Agent'}</Pill>
        <Pill tone="brand">{b.flagship}</Pill><Pill tone="neutral">{b.inDevelopment}</Pill><Pill tone="neutral">{b.lowConfidence}</Pill>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{row.name}</h2>
          <p data-testid="flagship-summary" className="mt-1 max-w-prose text-sm text-text-muted">{b.cardText}</p>
          <ol className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {b.cardPipeline.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-border px-2.5 py-1 font-mono uppercase tracking-widest text-text-muted">{String(i + 1).padStart(2, '0')} {step}</span>
                {i < b.cardPipeline.length - 1 && <span aria-hidden="true" className="hidden h-px w-3 bg-border-strong sm:inline-block" />}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div>
            {q.loading && run && !s && <div role="status" aria-label={copy.cockpit.loading} className="h-9 w-64 max-w-full animate-pulse rounded-md bg-border" />}
            {q.error && <p role="alert" className="text-sm text-danger-500">{copy.cockpit.error} {q.error}</p>}
            {s && <><p className="text-sm text-text-muted">{b.cardSample(s.items)}</p><p data-testid="flagship-value" data-tabular className="mt-1 text-3xl font-semibold tracking-tight">{b.cardValue(formatMillions(s.savings_low), formatMillions(s.savings_high))}</p></>}
            <p data-testid="flagship-run" className="mt-1 text-sm text-text-muted">{run?.finished_at && s ? b.cardRun(stamp(run.finished_at), s.items) : b.cardNotRun}</p>
            {error && <p role="alert" className="mt-2 text-xs text-danger-500">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" data-testid="flagship-run-button" loading={running} onClick={go}>{b.run}</Button>
            <Link to={{ pathname: `/agents/${row.case_key}`, search }} data-testid="flagship-open"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium no-underline transition-colors duration-fast hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:bg-bg">{b.open}</Link>
          </div>
        </div>
      </div>
    </article>
  )
}
