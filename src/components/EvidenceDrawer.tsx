import { useEffect } from 'react'
import type { Period } from '../lib/period'
import type { OrderLine, RegisterRow } from '../lib/data'
import { getOrderLines } from '../lib/data'
import { formatEur, formatInt, formatPrice } from '../lib/format'
import { useQuery } from '../lib/useQuery'
import { copy } from '../copy'
import { Button } from './Button'
import { FindingActions } from './FindingActions'
import { Pill } from './Pill'
import { ErrorState, Skeleton } from './States'

export function EvidenceDrawer({ row, period, onClose, onStatus }: { row: RegisterRow; period: Period; onClose: () => void; onStatus: (status: string) => void }) {
  const q = useQuery<OrderLine[]>(() => getOrderLines(row.supplier_no ?? 0, row.article_no ?? 0, period), [row.id, period.from, period.to])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const lines = q.data ?? []
  return (
    <aside role="dialog" aria-modal="true" aria-label={copy.agent.evidenceDrawer} data-testid="evidence-drawer"
      className="fixed inset-y-0 right-0 z-10 flex w-full max-w-2xl flex-col border-l border-border bg-surface shadow-lg motion-safe:animate-[drawer_200ms_var(--ease-out-quart)]">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.evidenceDrawer.replace('2026', `${period.from} to ${period.to}`)}</p>
          <h2 className="mt-1 text-lg font-semibold">{lines[0]?.description ?? ''} {row.article_no}, {lines[0]?.supplier_name ?? row.supplier_no}</h2>
        </div>
        <Button onClick={onClose} aria-label={copy.agent.close}>{copy.agent.close}</Button>
      </div>
      <div className="border-b border-border px-6 py-3"><FindingActions row={row} onChanged={onStatus} /></div>
      <div className="overflow-auto px-6 py-4">
        {q.error && <ErrorState text={copy.cockpit.error} detail={q.error} />}
        {q.loading && <Skeleton lines={6} />}
        {!q.loading && !q.error && (
          <table className="w-full text-sm">
            <thead className="text-left font-mono text-xs uppercase tracking-widest text-text-muted">
              <tr><th className="py-2 pr-3 font-normal">{copy.table.order}</th><th className="py-2 pr-3 font-normal">{copy.table.date}</th><th className="py-2 pr-3 font-normal">Reference</th><th className="py-2 pr-3 text-right font-normal">{copy.table.quantity}</th><th className="py-2 pr-3 text-right font-normal">{copy.table.paid}</th><th className="py-2 text-right font-normal">Spend</th></tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={`${l.order_no}-${l.order_position}`} data-testid="evidence-row" className={`border-t border-border ${l.contract_no ? '' : 'bg-brand-tint/60'}`}>
                  <td className="py-2 pr-3 tabular-nums">{l.order_no}</td>
                  <td className="py-2 pr-3 tabular-nums">{l.order_date}</td>
                  <td className="py-2 pr-3">{l.contract_no ? <Pill tone="positive">{copy.agent.referenced}</Pill> : <Pill tone="brand">{copy.agent.unreferenced}</Pill>}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatInt(l.quantity)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatPrice(l.unit_price)}</td>
                  <td className="py-2 text-right tabular-nums">{formatEur(l.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  )
}
