import type { RegisterRow } from '../lib/data'
import { formatEur, formatInt, formatPrice } from '../lib/format'
import { copy } from '../copy'
import { Button } from './Button'
import { StatusPill } from './StatusPill'

export interface Column { key: string; label: string; render: (r: RegisterRow, names: Names) => string; align?: 'right' }
export interface Names { suppliers: Record<number, string>; articles: Record<number, string> }

export const columns = {
  order: { key: 'order', label: copy.table.order, render: (r: RegisterRow) => (r.order_no ? String(r.order_no) : '') },
  date: { key: 'date', label: copy.table.date, render: (r: RegisterRow) => r.order_date ?? '' },
  article: { key: 'article', label: copy.table.article, render: (r: RegisterRow, n: Names) => `${n.articles[r.article_no ?? -1] ?? ''} ${r.article_no ?? ''}`.trim() },
  supplier: { key: 'supplier', label: copy.table.supplier, render: (r: RegisterRow, n: Names) => n.suppliers[r.supplier_no ?? -1] ?? String(r.supplier_no ?? '') },
  quantity: { key: 'quantity', label: copy.table.quantity, render: (r: RegisterRow) => formatInt(r.volume), align: 'right' as const },
  volume: { key: 'volume', label: copy.table.volume, render: (r: RegisterRow) => formatInt(r.volume), align: 'right' as const },
  paid: { key: 'paid', label: copy.table.paid, render: (r: RegisterRow) => formatPrice(r.baseline), align: 'right' as const },
  baseline: { key: 'baseline', label: copy.table.baseline, render: (r: RegisterRow) => formatPrice(r.baseline), align: 'right' as const },
  contractPrice: { key: 'contractPrice', label: copy.table.contractPrice, render: (r: RegisterRow) => formatPrice(r.target), align: 'right' as const },
  tierPrice: { key: 'tierPrice', label: copy.table.tierPrice, render: (r: RegisterRow) => formatPrice(r.target), align: 'right' as const },
  target: { key: 'target', label: copy.table.target, render: (r: RegisterRow) => formatPrice(r.target), align: 'right' as const },
  gap: { key: 'gap', label: copy.table.gap, render: (r: RegisterRow) => formatEur(r.gap_eur), align: 'right' as const },
  status: { key: 'status', label: 'Status', render: (r: RegisterRow) => r.status },
} satisfies Record<string, Column>

interface Props { rows: RegisterRow[]; cols: Column[]; names: Names; total: number; count: number; page: number; pageSize: number; onPage: (p: number) => void; onRow?: (r: RegisterRow) => void; selectedId?: number; testId: string; runId?: number; revealIds?: Set<number> }

export function RegisterTable({ rows, cols, names, total, count, page, pageSize, onPage, onRow, selectedId, testId, runId, revealIds }: Props) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  return (
    <div data-testid={testId} data-run-id={runId ?? ''} className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-bg text-left font-mono text-xs uppercase tracking-widest text-text-muted">
          <tr>{cols.map((c) => <th key={c.key} scope="col" className={`px-4 py-3 font-normal ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-order={r.order_no ?? ''} data-article={r.article_no ?? ''} aria-selected={selectedId === r.id || undefined} tabIndex={onRow ? 0 : undefined}
              onClick={() => onRow?.(r)} onKeyDown={(e) => { if (onRow && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRow(r) } }}
              className={`border-t border-border transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none ${onRow ? 'cursor-pointer hover:bg-brand-tint/60' : ''} aria-selected:bg-brand-tint ${revealIds?.has(r.id) ? 'reveal' : ''}`}>
              {cols.map((c) => <td key={c.key} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.key === 'status' ? <StatusPill status={r.status} /> : c.render(r, names)}</td>)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-strong bg-bg font-medium">
            <td className="px-4 py-3" colSpan={cols.length - 1}>{copy.agent.total}, {formatInt(count)} {copy.agent.register.toLowerCase()}</td>
            <td data-testid={`${testId}-total`} className="px-4 py-3 text-right tabular-nums">{formatEur(total)}</td>
          </tr>
        </tfoot>
      </table>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-sm text-text-muted">
          <span data-testid={`${testId}-page`}>{copy.agent.page(page + 1, pages)}</span>
          <div className="flex gap-2">
            <Button onClick={() => onPage(page - 1)} disabled={page === 0}>{copy.agent.previous}</Button>
            <Button onClick={() => onPage(page + 1)} disabled={page >= pages - 1}>{copy.agent.next}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
