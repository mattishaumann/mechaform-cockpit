import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AgentCard } from '../components/AgentCard'
import { Button } from '../components/Button'
import { RunLog } from '../components/RunLog'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { AGENTS, enabledAgents } from '../lib/agents'
import { getCases, getDedup, getLatestRuns, getRunLog, getStats, runAgent, subscribe, type RunRow } from '../lib/data'
import { formatEur, formatInt } from '../lib/format'
import { periodLabel, usePeriod } from '../lib/period'
import { useQuery } from '../lib/useQuery'

export function Cockpit() {
  const { period } = usePeriod()
  const { search } = useLocation()
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const q = useQuery(async () => {
    const [cases, runs, log, dedup, stats] = await Promise.all([getCases(), getLatestRuns(period), getRunLog(5), getDedup(period), getStats()])
    return { cases, runs, log, dedup, stats }
  }, [period.from, period.to, tick])
  useEffect(() => subscribe(() => {}, () => refresh()), [refresh])

  const runAll = async () => {
    setRunning(true)
    try { for (const a of enabledAgents) await runAgent(a, period) } finally { setRunning(false); refresh() }
  }

  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (q.loading && !q.data) return <Skeleton lines={5} />
  const data = q.data!
  const enabled = enabledAgents.map((k) => data.cases.find((c) => c.case_key === k)).filter((c): c is NonNullable<typeof c> => Boolean(c))
  if (enabled.length === 0) return <EmptyState text={copy.cockpit.empty} />
  const layerNames = enabled.flatMap((c) => AGENTS[c.case_key as keyof typeof AGENTS]?.layers?.map((l) => l.key) ?? [c.name])
  const runs = data.runs.filter((r: RunRow) => layerNames.includes(r.case_name))
  const headline = runs.reduce((s, r) => s + r.total, 0)
  const lastRun = runs.map((r) => r.finished_at).filter(Boolean).sort().at(-1) ?? null
  const cliff = data.stats.contract_cliff_spend as { value: number } | undefined
  const blocked = data.stats.blocked_supplier_spend as { value: number; suppliers: number } | undefined
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{copy.cockpit.title}</h1>
          <p className="mt-2 max-w-prose text-text-muted">{copy.cockpit.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.lastRun} <time data-testid="last-run" dateTime={lastRun ?? ''}>{lastRun ? new Date(lastRun).toLocaleString('en-GB') : copy.cockpit.notRun}</time></p>
          <Button variant="primary" data-testid="run-all" loading={running} onClick={runAll}>{copy.cockpit.runAll}</Button>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div data-testid="headline" className="rounded-lg border border-border bg-surface p-6 md:col-span-2">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.headlineLabel}, {periodLabel(period)}</p>
          <p data-tabular className="mt-2 text-5xl font-semibold tracking-tight text-brand">{formatEur(headline)}</p>
          <ul className="mt-4 space-y-1 text-sm text-text-muted">
            {[...runs].sort((a, b) => b.total - a.total).map((r) => <li key={r.id} className="flex justify-between gap-4"><span>{r.case_name}</span><span data-tabular className="text-text">{formatEur(r.total)}</span></li>)}
          </ul>
          {enabled.length > 1 && data.dedup && (
            <p data-testid="dedup" className="mt-4 border-t border-border pt-3 text-sm text-text-muted">{copy.cockpit.dedup}: <span data-tabular className="font-medium text-text">{formatEur(data.dedup.dedup)}</span> ({copy.cockpit.gross.toLowerCase()} {formatEur(data.dedup.gross)})</p>
          )}
        </div>
        <div data-testid="kept-apart" className="rounded-lg border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.keptApart}</p>
          {cliff && <p className="mt-2 text-sm"><span data-tabular className="text-lg font-semibold">{formatEur(cliff.value)}</span><br /><span className="text-text-muted">{copy.cockpit.contractCliff}</span></p>}
          {blocked && <p className="mt-3 text-sm"><span data-tabular className="text-lg font-semibold">{formatEur(blocked.value)}</span><br /><span className="text-text-muted">{copy.cockpit.blockedSpend}, {formatInt(blocked.suppliers)} suppliers</span></p>}
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {enabled.map((c) => <AgentCard key={c.case_key} row={c} runs={data.runs} search={search} />)}
      </div>
      <h2 className="mt-8 font-mono text-xs uppercase tracking-widest text-text-muted">{copy.runs.title}</h2>
      <div className="mt-2"><RunLog runs={data.log} /></div>
    </section>
  )
}
