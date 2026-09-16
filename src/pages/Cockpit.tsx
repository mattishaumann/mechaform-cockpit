import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ActionInbox } from '../components/ActionInbox'
import { AgentList } from '../components/AgentList'
import { Button } from '../components/Button'
import { Fold } from '../components/Fold'
import { RunLog } from '../components/RunLog'
import { ActivityFeed } from '../components/ActivityFeed'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { enabledAgents, previewAgents, previewPages } from '../lib/agents'
import { getCases, getEvents, getLatestRuns, getRunLog, getSavingsSplit, getStats, runAgent, subscribe, type CaseRow } from '../lib/data'
import { formatEur, formatInt } from '../lib/format'
import { getInbox, type InboxRow } from '../lib/inbox'
import { periodLabel, usePeriod } from '../lib/period'
import { useQuery } from '../lib/useQuery'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const INBOX = 5

// UI experiment "reduced": the buyer opens the cockpit to learn what to do next. So the page answers that first (one figure, the
// recommended next steps with their reason and owner), then lists the agents compactly; exposures and run history are one click away.
export function Cockpit() {
  const { period } = usePeriod()
  const { search } = useLocation()
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const q = useQuery(async () => {
    const [cases, runs, log, split, stats, events] = await Promise.all([getCases(), getLatestRuns(period), getRunLog(5), getSavingsSplit(period), getStats(), getEvents(10)])
    return { cases, runs, log, split, stats, events }
  }, [period.from, period.to, tick])
  const inbox = useQuery(() => getInbox(period, INBOX), [period.from, period.to, tick])
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
  const cliff = data.stats.contract_cliff_spend as { value: number } | undefined
  const blocked = data.stats.blocked_supplier_spend as { value: number; suppliers: number } | undefined
  const benchmark = previewAgents.includes('price_benchmark') ? data.cases.find((c) => c.case_key === 'price_benchmark') : undefined
  const previews = previewAgents.map((k) => data.cases.find((c) => c.case_key === k)).filter((c): c is CaseRow => Boolean(c))
  const inboxRows: InboxRow[] = inbox.data?.rows ?? []
  const shownGap = inboxRows.reduce((s, r) => s + r.gap_eur, 0)
  const previewLinks = [
    ...previews.map((c) => ({ key: c.case_key, to: `/agents/${c.case_key}`, name: c.name })),
    ...previewPages.map((p) => ({ key: p.key, to: p.path, name: copy.index.previewPageName[p.key] ?? p.key })),
  ]

  return (
    <section className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-prose">
          <p className={label}>{periodLabel(period)}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{copy.reduced.title}</h1>
          <p data-testid="headline" className="mt-3 text-lg">
            <span data-testid="hard-savings" data-tabular className="font-semibold text-brand">{formatEur(split?.hard ?? 0)}</span>
            <span className="text-text-muted"> {copy.reduced.intro(formatInt(inbox.data?.count ?? 0))}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-xs text-text-muted">{copy.cockpit.lastRun} <time data-testid="last-run" dateTime={lastRun ?? ''}>{lastRun ? new Date(lastRun).toLocaleString('en-GB') : copy.cockpit.notRun}</time></p>
          <Button variant="secondary" data-testid="run-all" loading={running} disabled={switchedOn.length === 0} onClick={runAll}>{copy.cockpit.runAll}</Button>
        </div>
      </header>

      <section aria-labelledby="next-steps">
        <h2 id="next-steps" className={label}>{copy.reduced.nextSteps}</h2>
        <div className="mt-3">
          <ActionInbox rows={inboxRows} loading={inbox.loading && !inbox.data} error={inbox.error} search={search}
            restCount={Math.max(0, (inbox.data?.count ?? 0) - inboxRows.length)} restTotal={Math.max(0, (inbox.data?.total ?? 0) - shownGap)} />
        </div>
      </section>

      <section aria-labelledby="agents">
        <h2 id="agents" className={label}>{copy.reduced.agentsTitle}</h2>
        <div className="mt-3"><AgentList cases={shown} runs={data.runs} search={search} onSwitched={refresh} /></div>
        {previewLinks.length > 0 && (
          <p data-testid="preview-line" className="mt-3 text-sm text-text-muted">
            {copy.reduced.previewLine}{' '}
            {previewLinks.map((p, i) => (
              <span key={p.key}>
                <Link data-testid={`preview-card-${p.key}`} to={{ pathname: p.to, search }} className="rounded-sm text-text underline decoration-border-strong underline-offset-4 hover:decoration-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:text-text-muted">{p.name}</Link>
                {i < previewLinks.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <Fold summary={copy.reduced.moreTitle} testId="kept-apart">
          <ul className="space-y-2 text-sm">
            {cliff && <li><span data-tabular className="font-semibold">{formatEur(cliff.value)}</span> <span className="text-text-muted">{copy.cockpit.contractCliff}</span></li>}
            {blocked && <li><span data-tabular className="font-semibold">{formatEur(blocked.value)}</span> <span className="text-text-muted">{copy.cockpit.blockedSpend}, {formatInt(blocked.suppliers)} suppliers. {copy.cockpit.exposureReco}</span></li>}
            {split && <li data-testid="gross" className="text-text-muted">{copy.cockpit.grossNote(formatEur(split.gross))}</li>}
            {benchmark && <li data-testid="benchmark-note" className="text-text-muted">{benchmark.name}: {copy.benchmark.headlineNote}. {copy.benchmark.headlineNoteTail}</li>}
          </ul>
        </Fold>
        <Fold summary={copy.reduced.historyTitle} testId="history">
          <div className="grid gap-6 lg:grid-cols-2">
            <div><h3 className={label}>{copy.feed.title}</h3><div className="mt-2"><ActivityFeed events={data.events} /></div></div>
            <div><h3 className={label}>{copy.runs.title}</h3><div className="mt-2"><RunLog runs={data.log} /></div></div>
          </div>
        </Fold>
      </section>
    </section>
  )
}
