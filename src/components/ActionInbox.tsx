import { Link } from 'react-router-dom'
import type { InboxRow } from '../lib/inbox'
import { actionOf } from '../lib/inbox'
import { formatEur, formatInt } from '../lib/format'
import { copy } from '../copy'
import { EmptyState, ErrorState, Skeleton } from './States'

// The recommended next steps, one per supplier: what to do and with whom, how much, why in one sentence, who acts, and the evidence
// one click away. Nothing else on the row: every detail lives behind the link.
export function ActionInbox({ rows, loading, error, search, restCount, restTotal, testId = 'action-inbox', showAgent = true }: {
  rows: InboxRow[]; loading: boolean; error: string | null; search: string; restCount: number; restTotal: number; testId?: string; showAgent?: boolean
}) {
  if (error) return <ErrorState text={copy.reduced.inboxError} detail={error} />
  if (loading) return <Skeleton lines={4} />
  if (rows.length === 0) return <EmptyState text={copy.reduced.inboxEmpty} />
  const who = (r: InboxRow) => (r.role === 'Einkäufer' && r.role_id ? copy.reco.buyer(r.role_id) : r.role === 'Kategorieeinkauf' && r.role_id ? copy.reco.category(r.role_id) : r.role ?? '')
  return (
    <div data-testid={testId}>
      <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.map((r, i) => (
          <li key={`${r.case_name}-${r.supplier_no}`} data-testid="inbox-item" data-agent={r.agent} className="grid gap-x-6 gap-y-1 p-4 sm:grid-cols-[1fr_auto]">
            <p className="text-base font-medium">
              <span data-tabular className="mr-3 text-text-muted">{i + 1}</span>
              {actionOf(r)} <span className="text-text-muted">{copy.reduced.with}</span> {r.supplier_name ?? r.supplier_no}
            </p>
            <p data-tabular className="text-base font-semibold sm:text-right">{formatEur(r.gap_eur)}</p>
            <p className="max-w-prose text-sm text-text-muted sm:col-span-2 sm:pl-6">{r.findings > 1 ? `${copy.reduced.example} ` : ""}{r.rationale}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 sm:pl-6">
              <p className="text-xs text-text-muted">
                {copy.reduced.who(who(r))} · {copy.reduced.scope(formatInt(r.findings), formatInt(r.articles))}{showAgent ? ` · ${r.case_name}` : ''}
              </p>
              <Link to={{ pathname: `/agents/${r.agent}`, search: withFinding(search, r.top_register_id) }}
                className="rounded-md px-2 py-1 text-sm font-medium text-text underline decoration-border-strong underline-offset-4 transition-colors duration-fast hover:decoration-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:text-text-muted">
                {copy.reduced.open}
              </Link>
            </div>
          </li>
        ))}
      </ol>
      {restCount > 0 && <p data-testid="inbox-rest" className="mt-2 text-sm text-text-muted">{copy.reduced.rest(formatInt(restCount), formatEur(restTotal))} <Link to={{ pathname: '/register', search }} className="rounded-sm underline decoration-border-strong underline-offset-4 hover:decoration-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{copy.reduced.toRegister}</Link></p>}
    </div>
  )
}

function withFinding(search: string, id: number) {
  const p = new URLSearchParams(search)
  p.set('finding', String(id))
  return `?${p.toString()}`
}
