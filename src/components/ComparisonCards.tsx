import type { RegisterRow } from '../lib/data'
import { formatEur, formatInt, formatPct, formatPrice, toNumber } from '../lib/format'
import type { Names } from './RegisterTable'
import { copy } from '../copy'
import { EmptyState } from './States'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'

function Side({ title, name, price, share, onTime, tone }: { title: string; name: string; price: number; share: unknown; onTime: unknown; tone: 'neutral' | 'positive' }) {
  return (
    <div className="min-w-0">
      <p className={`${label} flex items-center gap-2`}><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'positive' ? 'bg-positive' : 'bg-series-neutral'}`} />{title}</p>
      <p className="mt-2 text-sm font-medium">{name}</p>
      <p data-tabular className="mt-1 text-2xl font-semibold tracking-tight">{formatPrice(price)}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div><dt className={label}>{copy.charts.share}</dt><dd data-tabular className="mt-1">{formatPct(share, 0)}</dd></div>
        <div><dt className={label}>{copy.charts.onTime}</dt><dd data-tabular className="mt-1">{onTime == null ? 'n/a' : formatPct(onTime, 0)}</dd></div>
      </dl>
    </div>
  )
}

// Preferred Steering's chart: offer comparison cards in Tacto's pattern, preferred against the cheapest supplier, largest gaps first.
export function ComparisonCards({ rows, names, onRow }: { rows: RegisterRow[]; names: Names; onRow: (r: RegisterRow) => void }) {
  if (rows.length === 0) return <EmptyState text={copy.charts.noRun} />
  return (
    <figure data-testid="comparison-cards">
      <figcaption className={label}>{copy.charts.comparison}</figcaption>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {rows.map((r) => {
          const d = r.detail ?? {}
          return (
            <button key={r.id} type="button" data-testid="comparison-card" onClick={() => onRow(r)}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none flex flex-col justify-start rounded-lg border border-border bg-surface p-4 text-left transition-colors duration-fast hover:border-border-strong active:scale-95">
              <p className="text-sm font-semibold">{names.articles[r.article_no ?? -1] ?? ''} {r.article_no}</p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Side title={copy.charts.preferred} name={String(d.pref_name ?? names.suppliers[r.supplier_no ?? -1] ?? '')} price={r.baseline} share={d.pref_share} onTime={d.pref_on_time} tone="neutral" />
                <Side title={copy.charts.cheapest} name={String(d.alt_name ?? '')} price={toNumber(d.alt_price)} share={d.alt_share} onTime={d.alt_on_time} tone="positive" />
              </div>
              <p className="mt-4 border-t border-border pt-3 text-sm"><span className="font-medium">{copy.charts.cheaper(formatPct(d.alt_discount, 1))}</span> <span className="text-text-muted">{copy.charts.gapOn(formatEur(r.gap_eur), formatInt(r.volume))}</span></p>
            </button>
          )
        })}
      </div>
    </figure>
  )
}
