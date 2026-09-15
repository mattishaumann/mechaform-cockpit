import type { BridgeRow } from '../lib/data'
import { formatEur, formatPct } from '../lib/format'
import { copy } from '../copy'
import { EmptyState } from './States'

// Terms Floor's chart: a bridge from the Skonto gained to the net gain. The deduction floats between the two totals.
// Bars are positioned in percent of the gross; every value comes from v_terms_floor_bridge.
export function TermsBridge({ data, rate, day }: { data: BridgeRow | null; rate: number; day: number }) {
  if (!data || data.gross <= 0) return <EmptyState text={copy.charts.noRun} />
  const pct = (v: number) => `${(100 * v) / data.gross}%`
  const steps = [
    { key: 'gross', label: copy.charts.gross, value: formatEur(data.gross), left: '0%', width: '100%', tone: 'bg-brand' },
    { key: 'financing', label: copy.charts.financing(formatPct(rate, 0), String(day)), value: `- ${formatEur(data.financing)}`, left: pct(data.net), width: pct(data.financing), tone: 'bg-series-neutral' },
    { key: 'net', label: copy.charts.net, value: formatEur(data.net), left: '0%', width: pct(data.net), tone: 'bg-brand' },
  ]
  return (
    <figure data-testid="terms-bridge" className="rounded-lg border border-border bg-surface p-4">
      <figcaption className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.charts.bridge}</figcaption>
      <ol className="mt-4 space-y-4">
        {steps.map((s) => (
          <li key={s.key} data-step={s.key} className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-4">
            <div className="flex items-baseline justify-between gap-3 text-sm sm:block">
              <p className="text-text-muted">{s.label}</p>
              <p data-tabular className="font-medium text-text sm:mt-1">{s.value}</p>
            </div>
            <div className="relative h-6" title={`${s.label}: ${s.value}`}>
              <div aria-hidden="true" className={`absolute inset-y-0 rounded-r-sm ${s.tone}`} style={{ left: s.left, width: s.width }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-prose text-xs text-text-muted">{copy.charts.bridgeNote(data.suppliers)}</p>
    </figure>
  )
}
