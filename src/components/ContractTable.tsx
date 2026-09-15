import type { ContractRow } from '../lib/data'
import { formatEur, formatInt, formatPrice } from '../lib/format'
import { copy } from '../copy'
import { EmptyState } from './States'

const th = 'px-4 py-3 font-normal'

// Contract Guard's chart: the contracts behind the flagged lines, one row per contract position, largest gap first.
export function ContractTable({ rows, total }: { rows: ContractRow[]; total: number }) {
  if (rows.length === 0) return <EmptyState text={copy.charts.noRun} />
  return (
    <figure data-testid="contract-table" className="rounded-lg border border-border bg-surface">
      <figcaption className="px-4 pt-4 font-mono text-xs uppercase tracking-widest text-text-muted">{copy.charts.contracts}</figcaption>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left font-mono text-xs uppercase tracking-widest text-text-muted">
            <tr>
              <th scope="col" className={th}>{copy.charts.contract}</th>
              <th scope="col" className={th}>{copy.table.supplier}</th>
              <th scope="col" className={th}>{copy.table.article}</th>
              <th scope="col" className={`${th} text-right`}>{copy.table.contractPrice}</th>
              <th scope="col" className={`${th} text-right`}>{copy.charts.paid}</th>
              <th scope="col" className={`${th} text-right`}>{copy.charts.lines}</th>
              <th scope="col" className={`${th} text-right`}>{copy.table.gap}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.contract_no}-${r.article_no}`} data-contract={r.contract_no} className="border-t border-border">
                <td className="px-4 py-2.5 font-mono text-xs">{r.contract_no}</td>
                <td className="px-4 py-2.5">{r.supplier_name}</td>
                <td className="px-4 py-2.5">{r.description} {r.article_no}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatPrice(r.contract_price)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatPrice(r.paid)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatInt(r.lines)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatEur(r.gap)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-strong bg-bg font-medium">
              <td className="px-4 py-3" colSpan={6}>{copy.charts.contractsTotal(rows.length)}</td>
              <td data-testid="contract-table-total" className="px-4 py-3 text-right tabular-nums">{formatEur(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </figure>
  )
}
