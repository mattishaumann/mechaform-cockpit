import type { RegisterRow } from '../lib/data'
import type { CategoryRow } from '../lib/indexGuard'
import { formatEur, formatInt, formatPct, formatPrice, toNumber } from '../lib/format'
import type { Names } from './RegisterTable'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'
import { EmptyState } from './States'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const det = (r: RegisterRow, k: string): string | null => {
  const v = (r.detail ?? {})[k]
  return v == null ? null : String(v)
}
const pct = (v: unknown) => `${toNumber(v) >= 0 ? '+' : ''}${formatPct(v, 1)}`

// The run's largest findings as the things to do next: one line each, the numbers behind it, and the evidence one click away.
export function IndexActionItems({ rows, names, restCount, restGap, onOpen }: { rows: RegisterRow[]; names: Names; restCount: number; restGap: number; onOpen: (r: RegisterRow) => void }) {
  return (
    <section data-testid="index-actions" className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={label}>{copy.index.actionsTitle}</h2>
        <Pill tone="neutral">{copy.reco.sequence.internal_only}</Pill>
      </div>
      {rows.length === 0 ? <div className="mt-3"><EmptyState text={copy.index.actionsNone} /></div> : (
        <ol className="mt-3 space-y-3">
          {rows.map((r, i) => {
            const contract = det(r, 'contract_no')
            const article = `${names.articles[r.article_no ?? -1] ?? ''} ${r.article_no ?? ''}`.trim()
            return (
              <li key={r.id} data-testid="index-action" data-register-id={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-bg p-3">
                <div className="min-w-0 max-w-prose">
                  <p className="text-sm font-medium">
                    <span data-tabular className="mr-2 text-text-muted">{i + 1}</span>
                    {contract ? copy.index.actionContract(contract) : copy.index.actionNoContract(article)}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">{names.suppliers[r.supplier_no ?? -1] ?? r.supplier_no}, {article}</p>
                  <p className="mt-1 text-sm">{copy.index.actionNumbers(formatPrice(r.baseline), formatPrice(det(r, 'index_price')), pct(det(r, 'deviation')), formatEur(r.gap_eur), formatInt(r.volume))}</p>
                  <p className="mt-1 text-xs text-text-muted">{copy.index.actionAsk}</p>
                </div>
                <Button variant="secondary" onClick={() => onOpen(r)}>{copy.index.actionOpen}</Button>
              </li>
            )
          })}
        </ol>
      )}
      {restCount > 0 && <p data-testid="index-action-rest" className="mt-3 border-t border-border pt-3 text-sm text-text-muted">{copy.index.actionRest(formatInt(restCount), formatEur(restGap))}</p>}
    </section>
  )
}

// Verdict for the category shown in the chart: negotiate above the tolerance, watch below it, nothing when the basket explains the price.
export function CategoryVerdict({ row, tolerance }: { row: CategoryRow | null; tolerance: number }) {
  if (!row) return null
  const above = row.above_basket
  const verdict = above >= tolerance ? 'negotiate' : above > 0 ? 'watch' : 'none'
  const text = verdict === 'negotiate' ? copy.index.verdictNegotiateWhy(pct(above), formatEur(row.gap_eur), formatInt(row.findings))
    : verdict === 'watch' ? copy.index.verdictWatchWhy(pct(above), formatPct(tolerance, 0))
      : copy.index.verdictNoneWhy
  return (
    <div data-testid="index-verdict" data-verdict={verdict} className="mt-4 rounded-md border border-border bg-bg p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={verdict === 'negotiate' ? 'brand' : verdict === 'watch' ? 'neutral' : 'positive'}>
          {verdict === 'negotiate' ? copy.index.verdictNegotiate : verdict === 'watch' ? copy.index.verdictWatch : copy.index.verdictNone}
        </Pill>
        <p className="text-sm font-medium">{row.category_name ?? row.category_no}</p>
      </div>
      <p className="mt-2 max-w-prose text-sm">{text}</p>
      <p className="mt-1 text-sm text-text-muted">{copy.index.verdictSpread(row.paid_index.toFixed(1), row.basket_index.toFixed(1))}</p>
    </div>
  )
}
