import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AgentCard } from '../components/AgentCard'
import { Button } from '../components/Button'
import { Pill } from '../components/Pill'
import { RunLog } from '../components/RunLog'
import { ActivityFeed } from '../components/ActivityFeed'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { enabledAgents } from '../lib/agents'
import { getCases, getConfig, getEvents, getLatestRuns, getOpenTasks, getRunLog, getSavingsSplit, getStats, runAgent, subscribe, type CaseRow, type SavingsSplit } from '../lib/data'
import { formatEur, formatInt, formatPct } from '../lib/format'
import { periodLabel, usePeriod } from '../lib/period'
import { useQuery } from '../lib/useQuery'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const HARD: { key: keyof SavingsSplit; case_key: string }[] = [
  { key: 'hard_contract_guard', case_key: 'contract_guard' }, { key: 'hard_tier_guard', case_key: 'tier_guard' },
  { key: 'hard_preferred_steering', case_key: 'preferred_steering' }, { key: 'hard_terms_floor', case_key: 'terms_floor' },
]

export function Cockpit() {
  const { period } = usePeriod()
  const { search } = useLocation()
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const q = useQuery(async () => {
    const [cases, runs, log, split, stats, events, tasks, config] = await Promise.all([getCases(), getLatestRuns(period), getRunLog(5), getSavingsSplit(period), getStats(), getEvents(10), getOpenTasks(), getConfig()])
    return { cases, runs, log, split, stats, events, tasks, config }
  }, [period.from, period.to, tick])
  useEffect(() => subscribe(() => {}, () => refresh(), () => refresh()), [refresh])

  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (q.loading && !q.data) return <Skeleton lines={5} />
  const data = q.data!
  const shown = enabledAgents.map((k) => data.cases.find((c) => c.case_key === k)).filter((c): c is CaseRow => Boolean(c))
  if (shown.length === 0) return <EmptyState text={copy.cockpit.empty} />
  const switchedOn = shown.filter((c) => c.enabled)
  const runAll = async () => {
    setRunning(true)
    try { for (const c of switchedOn) await runAgent(c.case_key, period) } finally { setRunning(false); refresh() }
  }
  const lastRun = data.runs.map((r) => r.finished_at).filter(Boolean).sort().at(-1) ?? null
  const split = data.split
  const name = (k: string) => data.cases.find((c) => c.case_key === k)?.name ?? k
  const radarOn = Boolean(data.cases.find((c) => c.case_key === 'price_radar')?.enabled)
  const indexRate = data.config.find((c) => c.key === 'index_rate')?.value ?? 0
  const cliff = data.stats.contract_cliff_spend as { value: number } | undefined
  const blocked = data.stats.blocked_supplier_spend as { value: number; suppliers: number } | undefined
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{copy.cockpit.title}</h1>
          <p className="mt-2 max-w-prose text-text-muted">{copy.cockpit.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <p className={label}>{copy.cockpit.lastRun} <time data-testid="last-run" dateTime={lastRun ?? ''}>{lastRun ? new Date(lastRun).toLocaleString('en-GB') : copy.cockpit.notRun}</time></p>
          <Button variant="primary" data-testid="run-all" loading={running} disabled={switchedOn.length === 0} onClick={runAll}>{copy.cockpit.runAll}</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div data-testid="headline" className="rounded-lg border border-border bg-surface p-6 md:col-span-2">
          <p className={label}>{copy.cockpit.hardLabel}, {periodLabel(period)}</p>
          <p data-testid="hard-savings" data-tabular className="mt-2 text-5xl font-semibold tracking-tight text-brand">{formatEur(split?.hard ?? 0)}</p>
          <p className="mt-2 max-w-prose text-sm text-text-muted">{copy.cockpit.hardNote}</p>
          <ul className="mt-4 space-y-1 text-sm text-text-muted">
            {HARD.filter((h) => (split?.[h.key] ?? 0) > 0).map((h) => (
              <li key={h.key} className="flex justify-between gap-4"><span>{name(h.case_key)}</span><span data-tabular className="text-text">{formatEur(split?.[h.key])}</span></li>
            ))}
          </ul>
          {split && <p data-testid="gross" className="mt-4 border-t border-border pt-3 text-sm text-text-muted">{copy.cockpit.grossNote(formatEur(split.gross))}</p>}
        </div>
        <div data-testid="cost-avoidance" className="rounded-lg border border-border bg-surface p-6">
          <p className={label}>{copy.cockpit.avoidanceLabel}</p>
          {radarOn ? (
            <>
              <p data-tabular className="mt-2 text-3xl font-semibold tracking-tight">{formatEur(split?.cost_avoidance ?? 0)}</p>
              <p className="mt-2 text-sm text-text-muted">{copy.cockpit.avoidanceNote(formatPct(indexRate, 1))}</p>
            </>
          ) : <p className="mt-2 text-sm text-text-muted">{copy.cockpit.avoidanceOff}</p>}
        </div>
        <div data-testid="kept-apart" className="rounded-lg border border-border bg-surface p-6">
          <p className={label}>{copy.cockpit.keptApart}</p>
          {cliff && <p className="mt-2 text-sm"><span data-tabular className="text-lg font-semibold">{formatEur(cliff.value)}</span><br /><span className="text-text-muted">{copy.cockpit.contractCliff}</span></p>}
          {blocked && <p className="mt-3 text-sm"><span data-tabular className="text-lg font-semibold">{formatEur(blocked.value)}</span><br /><span className="text-text-muted">{copy.cockpit.blockedSpend}, {formatInt(blocked.suppliers)} suppliers</span></p>}
          {blocked && (
            <div data-testid="exposure-reco" className="mt-3 border-t border-border pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={label}>{copy.reco.title}</span><Pill tone="neutral">{copy.reco.sequence.internal_only}</Pill></div>
              <p className="mt-2 text-sm text-text-muted">{copy.cockpit.exposureReco}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => <AgentCard key={c.case_key} row={c} runs={data.runs} search={search} openTasks={data.tasks[c.case_key] ?? 0} onSwitched={refresh} />)}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div><h2 className={label}>{copy.feed.title}</h2><div className="mt-2"><ActivityFeed events={data.events} /></div></div>
        <div><h2 className={label}>{copy.runs.title}</h2><div className="mt-2"><RunLog runs={data.log} /></div></div>
      </div>
    </section>
  )
}
