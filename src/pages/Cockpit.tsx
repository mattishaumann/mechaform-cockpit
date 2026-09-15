import { useEffect, useState } from 'react'
import { AgentCard } from '../components/AgentCard'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { AGENTS, enabledAgents } from '../lib/agents'
import { getCases, getCaseTotals, getStats } from '../lib/data'
import { formatEur, formatInt } from '../lib/format'
import { useQuery } from '../lib/useQuery'

const interval = Number(import.meta.env.VITE_RUN_INTERVAL_MS ?? 60000)

function useLastRun() {
  const [at, setAt] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setAt(new Date()), interval); return () => clearInterval(id) }, [])
  return at
}

export function Cockpit() {
  const q = useQuery(async () => { const [cases, totals, stats] = await Promise.all([getCases(), getCaseTotals(), getStats()]); return { cases, totals, stats } }, [])
  const lastRun = useLastRun()
  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (q.loading || !q.data) return <Skeleton lines={5} />
  const enabled = enabledAgents.map((k) => q.data!.cases.find((c) => c.case_key === k)).filter((c): c is NonNullable<typeof c> => Boolean(c))
  if (enabled.length === 0) return <EmptyState text={copy.cockpit.empty} />
  const layerNames = enabled.flatMap((c) => AGENTS[c.case_key as keyof typeof AGENTS]?.layers?.map((l) => l.key) ?? [c.name])
  const headline = q.data.totals.filter((t) => layerNames.includes(t.case)).reduce((s, t) => s + t.total, 0)
  const cliff = q.data.stats.contract_cliff_spend as { value: number; share_of_2026_spend: number } | undefined
  const blocked = q.data.stats.blocked_supplier_spend as { value: number; suppliers: number } | undefined
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{copy.cockpit.title}</h1>
          <p className="mt-2 max-w-prose text-text-muted">{copy.cockpit.subtitle}</p>
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.lastRun} <time data-testid="last-run" dateTime={lastRun.toISOString()}>{lastRun.toLocaleTimeString('en-GB')}</time></p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div data-testid="headline" className="rounded-lg border border-border bg-surface p-6 md:col-span-2">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.headlineLabel}</p>
          <p data-tabular className="mt-2 text-5xl font-semibold tracking-tight text-brand">{formatEur(headline)}</p>
          <ul className="mt-4 space-y-1 text-sm text-text-muted">
            {q.data.totals.filter((t) => layerNames.includes(t.case)).sort((a, b) => b.total - a.total).map((t) => (
              <li key={t.case} className="flex justify-between gap-4"><span>{t.case}</span><span data-tabular className="text-text">{formatEur(t.total)}</span></li>
            ))}
          </ul>
        </div>
        <div data-testid="kept-apart" className="rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.keptApart}</p>
          {cliff && <p className="mt-2 text-sm"><span data-tabular className="text-lg font-semibold">{formatEur(cliff.value)}</span><br /><span className="text-text-muted">{copy.cockpit.contractCliff}</span></p>}
          {blocked && <p className="mt-3 text-sm"><span data-tabular className="text-lg font-semibold">{formatEur(blocked.value)}</span><br /><span className="text-text-muted">{copy.cockpit.blockedSpend}, {formatInt(blocked.suppliers)} suppliers</span></p>}
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {enabled.map((c) => <AgentCard key={c.case_key} row={c} totals={q.data!.totals} />)}
      </div>
    </section>
  )
}
