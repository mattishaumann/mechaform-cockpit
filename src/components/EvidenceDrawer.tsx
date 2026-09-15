import { useEffect, useRef, useState } from 'react'
import type { Period } from '../lib/period'
import type { OrderLine, RegisterRow } from '../lib/data'
import { EVIDENCE_LIMIT, getOrderLines } from '../lib/data'
import { formatEur, formatInt, formatPrice, toNumber } from '../lib/format'
import { useQuery } from '../lib/useQuery'
import { copy } from '../copy'
import { Button } from './Button'
import { FindingActions } from './FindingActions'
import { DraftPanel } from './DraftPanel'
import { Pill } from './Pill'
import { RecommendationCard } from './RecommendationCard'
import { ErrorState, Skeleton } from './States'

// Which order lines prove a finding: the pair for line-level cases, every supplier of the article for article-level cases,
// every line of the supplier for Terms Floor.
type Scope = 'pair' | 'article' | 'supplier'
const scopeOf = (c: string): Scope => (c === 'Terms Floor' ? 'supplier' : c === 'Price Radar' || c === 'Preferred Steering' ? 'article' : 'pair')
const th = 'py-2 pr-3 font-normal'

export function EvidenceDrawer({ row, period, onClose, onStatus }: { row: RegisterRow; period: Period; onClose: () => void; onStatus: (status: string) => void }) {
  const scope = scopeOf(row.case)
  const q = useQuery<OrderLine[]>(() => getOrderLines(scope === 'article' ? null : row.supplier_no, scope === 'supplier' ? null : row.article_no, period), [row.id, period.from, period.to])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const lines = q.data ?? []
  const detail = row.detail ?? {}
  const contractNo = typeof detail.contract_no === 'string' ? detail.contract_no : null
  const best = toNumber(detail.best_rate)
  const [draftOpen, setDraftOpen] = useState(false)
  const draftRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setDraftOpen(false) }, [row.id])
  useEffect(() => { if (draftOpen) draftRef.current?.scrollIntoView({ block: 'start' }) }, [draftOpen])

  const first = lines[0]
  const title = scope === 'supplier' ? first?.supplier_name ?? String(row.supplier_no ?? '')
    : scope === 'article' ? `${first?.description ?? ''} ${row.article_no ?? ''}${row.case === 'Preferred Steering' && detail.pref_name ? `, ${copy.charts.preferred} ${String(detail.pref_name)}` : ''}`
    : `${first?.description ?? ''} ${row.article_no ?? ''}, ${first?.supplier_name ?? row.supplier_no ?? ''}`
  // highlighted lines carry the finding: unreferenced for line-level cases, below the best Skonto for Terms Floor,
  // the preferred supplier's lines for Preferred Steering
  const marked = (l: OrderLine) => scope === 'pair' ? !l.contract_no : scope === 'supplier' ? (l.payment_terms_p1 ?? 0) < best : row.case === 'Preferred Steering' && l.supplier_no === row.supplier_no

  return (
    <aside role="dialog" aria-modal="true" aria-label={copy.agent.evidenceDrawer} data-testid="evidence-drawer"
      className="fixed inset-y-0 right-0 z-10 flex w-full max-w-4xl flex-col border-l border-border bg-surface shadow-lg motion-safe:animate-[drawer_200ms_var(--ease-out-quart)]">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.evidenceDrawer.replace('2026', `${period.from} to ${period.to}`)}</p>
          <h2 data-testid="drawer-title" className="mt-1 text-lg font-semibold">{title.trim()}</h2>
        </div>
        <Button onClick={onClose} aria-label={copy.agent.close}>{copy.agent.close}</Button>
      </div>
      <div className="border-b border-border px-6 py-3"><FindingActions row={row} onChanged={onStatus} /></div>
      <div className="overflow-auto px-6 py-4">
        <RecommendationCard row={row} onStatus={onStatus} draftOpen={draftOpen} onDraft={() => setDraftOpen(true)} />
        <h3 className="mt-6 font-mono text-xs uppercase tracking-widest text-text-muted">{copy.draft.evidence}</h3>
        {q.error && <ErrorState text={copy.cockpit.error} detail={q.error} />}
        {q.loading && <Skeleton lines={6} />}
        {!q.loading && !q.error && lines.length === 0 && <p className="mt-2 text-sm text-text-muted">{copy.agent.noLines}</p>}
        {!q.loading && !q.error && lines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left font-mono text-xs uppercase tracking-widest text-text-muted">
                <tr>
                  <th className={th}>{copy.table.order}</th><th className={th}>{copy.table.date}</th>
                  {scope === 'pair' && <th className={th}>{copy.agent.reference}</th>}
                  {scope === 'article' && <th className={th}>{copy.table.supplier}</th>}
                  {scope === 'supplier' && <><th className={th}>{copy.agent.plant}</th><th className={`${th} text-right`}>Skonto</th><th className={`${th} text-right`}>{copy.agent.netDays}</th></>}
                  {scope !== 'supplier' && <><th className={`${th} text-right`}>{copy.table.quantity}</th><th className={`${th} text-right`}>{copy.table.paid}</th></>}
                  <th className="py-2 text-right font-normal">{copy.agent.spend}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={`${l.order_no}-${l.order_position}`} data-testid="evidence-row" data-marked={marked(l) || undefined} className={`border-t border-border ${marked(l) ? 'bg-brand-tint/60' : ''}`}>
                    <td className="py-2 pr-3 tabular-nums">{l.order_no}</td>
                    <td className="py-2 pr-3 tabular-nums">{l.order_date}</td>
                    {scope === 'pair' && <td className="py-2 pr-3">{l.contract_no ? <Pill tone="positive">{copy.agent.referenced}</Pill> : <Pill tone="brand">{copy.agent.unreferenced}</Pill>}</td>}
                    {scope === 'article' && <td className="py-2 pr-3">{l.supplier_name}</td>}
                    {scope === 'supplier' && <><td className="py-2 pr-3">{l.plant}</td><td className="py-2 pr-3 text-right tabular-nums">{l.payment_terms_p1 == null ? copy.agent.noSkonto : `${l.payment_terms_p1}%`}</td><td className="py-2 pr-3 text-right tabular-nums">{l.payment_terms_t3 ?? ''}</td></>}
                    {scope !== 'supplier' && <><td className="py-2 pr-3 text-right tabular-nums">{formatInt(l.quantity)}</td><td className="py-2 pr-3 text-right tabular-nums">{formatPrice(l.unit_price)}</td></>}
                    <td className="py-2 text-right tabular-nums">{formatEur(l.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lines.length >= EVIDENCE_LIMIT && <p className="mt-2 text-xs text-text-muted">{copy.agent.firstLines(EVIDENCE_LIMIT)}</p>}
          </div>
        )}
        {draftOpen && row.recommendation?.external && !q.loading && !q.error && <div ref={draftRef}><DraftPanel row={row} lines={lines} contractNo={contractNo} onStatus={onStatus} /></div>}
      </div>
    </aside>
  )
}
