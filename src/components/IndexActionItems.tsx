import type { RegisterRow } from '../lib/data'
import { Link } from 'react-router-dom'
import type { CategoryRow, TopSupplier } from '../lib/indexGuard'
import { formatEur, formatInt, formatPct, toNumber } from '../lib/format'
import { copy } from '../copy'
import { Button } from './Button'
import { Pill } from './Pill'
import { EmptyState } from './States'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const pct = (v: unknown) => `${toNumber(v) >= 0 ? '+' : ''}${formatPct(v, 1)}`

// The agent's recommendation per supplier: renegotiate where the index difference is largest, with the numbers behind it,
// the evidence one click away and the trainer for preparing the conversation.
export function IndexActionItems({ rows, findings, restCount, restGap, onOpen }: { rows: TopSupplier[]; findings: RegisterRow[]; restCount: number; restGap: number; onOpen: (r: RegisterRow) => void }) {
  return (
    <section data-testid="index-actions" className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={label}>{copy.index.actionsTitle}</h2>
        <Pill tone="neutral">{copy.reco.sequence.internal_only}</Pill>
      </div>
      {rows.length === 0 ? <div className="mt-3"><EmptyState text={copy.index.actionsNone} /></div> : (
        <ol className="mt-3 space-y-3">
          {rows.map((r, i) => {
            const evidence = findings.find((f) => f.id === r.top_register_id)
            return (
              <li key={r.supplier_no} data-testid="index-action" data-supplier={r.supplier_no} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-bg p-3">
                <div className="min-w-0 max-w-prose">
                  <p className="text-sm font-medium">
                    <span data-tabular className="mr-2 text-text-muted">{i + 1}</span>
                    {copy.index.supplierAction(r.supplier_name)}
                  </p>
                  <p className="mt-1 text-sm">{copy.index.supplierNumbers(formatInt(r.findings), formatInt(r.articles), pct(r.deviation), formatEur(r.gap_eur))}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {r.top_article && copy.index.supplierArticle(r.top_article)}
                    {r.contract_count > 0 && r.top_contract_no && <> · {copy.index.supplierContracts(formatInt(r.contract_count), r.top_contract_no)}</>}
                  </p>
                  <p className="mt-2 text-sm">
                    <Link data-testid="index-train" to="/trainer" className="rounded-sm text-text underline decoration-border-strong underline-offset-2 transition-colors duration-fast hover:decoration-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:text-text-muted">{copy.index.trainLink}</Link>
                  </p>
                </div>
                {evidence && <Button variant="secondary" onClick={() => onOpen(evidence)}>{copy.index.actionOpen}</Button>}
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
