import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { HowPanel } from '../components/HowPanel'
import { ActionInbox } from '../components/ActionInbox'
import { Fold } from '../components/Fold'
import { getInbox, getRegisterRow } from '../lib/inbox'
import { IndexGuardPanel } from '../components/IndexGuardPanel'
import { PriceBenchmarkPanel } from '../components/PriceBenchmarkPanel'
import { indexLayerColumns } from '../lib/indexGuard'
import { columns, RegisterTable, type Column } from '../components/RegisterTable'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { ContractTable } from '../components/ContractTable'
import { TermsBridge } from '../components/TermsBridge'
import { TierYearChart, type TierYear } from '../components/TierYearChart'
import { copy } from '../copy'
import { AGENTS, type CaseKey } from '../lib/agents'
import { getCases, getConfig, getContractTable, getLatestRuns, getRegister, getStats, getTermsBridge, runAgent, subscribe, type BridgeRow, type ConfigRow, type ContractRow, type RegisterRow, type RunRow } from '../lib/data'
import { formatEur, formatInt, formatPrice } from '../lib/format'
import { getNames } from '../lib/names'
import { periodLabel, usePeriod } from '../lib/period'
import { useQuery } from '../lib/useQuery'

const PAGE = 50
const cfgValue = (params: ConfigRow[], k: string) => params.find((c) => c.key === k)?.value ?? 0
const priceCol: Column = { key: 'price', label: copy.reduced.price, render: (r: RegisterRow) => copy.reduced.priceCell(formatPrice(r.baseline), formatPrice(r.target)), align: 'right' }
// UI experiment "reduced": who, what, the price against the reference, the gap and the status; everything else is in the drawer
const layerColumns: Record<string, Column[]> = {
  'Contract Guard': [columns.supplier, columns.article, columns.order, priceCol, columns.gap, columns.status],
  'Tier Guard': [columns.supplier, columns.article, columns.order, priceCol, columns.gap, columns.status],
  'Tier Guard (annual volume)': [columns.supplier, columns.article, priceCol, columns.gap, columns.status],
  'Terms Floor': [columns.supplier, columns.volume, columns.gap, columns.status],
  ...indexLayerColumns,   // preview agent Index Guard
}

function Findings({ run, label, testId, onRow, selectedId, live, revealIds }: { run: RunRow; label?: string; testId: string; onRow?: (r: RegisterRow) => void; selectedId?: number; live: number; revealIds: Set<number> }) {
  const [page, setPage] = useState(0)
  const q = useQuery(async () => {
    const { rows, count } = await getRegister(run.id, page, PAGE)
    const names = await getNames([...new Set(rows.map((r) => r.supplier_no).filter((x): x is number => x != null))], [...new Set(rows.map((r) => r.article_no).filter((x): x is number => x != null))])
    return { rows, count, names }
  }, [run.id, page, live])
  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (!q.data) return <Skeleton lines={8} />
  if (q.data.count === 0) return <EmptyState text={`No findings for ${run.case_name} in this period.`} />
  return (
    <section className="mt-6">
      {label && <h2 className="mb-3 text-lg font-semibold">{label}</h2>}
      <RegisterTable rows={q.data.rows} cols={layerColumns[run.case_name] ?? [columns.article, columns.supplier, columns.volume, columns.baseline, columns.gap]} names={q.data.names}
        total={run.total} count={q.data.count} page={page} pageSize={PAGE} onPage={setPage} onRow={onRow} selectedId={selectedId} testId={testId} runId={run.id} revealIds={revealIds} />
    </section>
  )
}

export function Agent() {
  const { key } = useParams<{ key: CaseKey }>()
  const { period } = usePeriod()
  const [tick, setTick] = useState(0)
  const [live, setLive] = useState(0)
  const [revealIds, setRevealIds] = useState<Set<number>>(new Set())
  const [running, setRunning] = useState(false)
  const [selected, setSelected] = useState<RegisterRow | null>(null)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const q = useQuery(async () => {
    const [cases, runs, stats] = await Promise.all([getCases(), getLatestRuns(period), getStats()])
    const row = cases.find((c) => c.case_key === key)
    const config = key && key in AGENTS ? AGENTS[key] : undefined
    const layers = config?.layers ?? (row ? [{ key: row.name, label: '' }] : [])
    const layerRuns = layers.map((l) => runs.find((r) => r.case_name === l.key)).filter((r): r is RunRow => Boolean(r))
    const main = layerRuns[0]
    // the page's one chart, read for the main run
    const chart: { contracts?: ContractRow[]; bridge?: BridgeRow | null } = {}
    if (main && config?.chart === 'contract_table') chart.contracts = await getContractTable(main.id)
    if (main && config?.chart === 'bridge') chart.bridge = await getTermsBridge(main.id)
    // thresholds shown in the explanation: the agent's own, plus the due days its tasks use
    const due = key === 'contract_guard' || key === 'tier_guard' ? ['due_days_po_correction', 'due_days_task'] : ['due_days_task']
    const params = (await getConfig()).filter((c) => c.case_key === key || due.includes(c.key))
    return { row, config, layers, layerRuns, chart, stats, params }
  }, [key, period.from, period.to, tick])
  useEffect(() => subscribe((r) => { setRevealIds((ids) => new Set(ids).add(r.id)); if (q.data?.layerRuns.some((x) => x.id === r.run_id)) setLive((n) => n + 1) }, (r) => { if (r.agent === key && r.status === 'done') refresh() }), [key, refresh, q.data?.layerRuns])
  useEffect(() => { setSelected(null) }, [period.from, period.to])
  const { search } = useLocation()
  const findingId = Number(new URLSearchParams(search).get('finding') ?? 0)
  useEffect(() => {
    if (!findingId) return
    let alive = true
    getRegisterRow(findingId).then((r) => { if (alive && r) setSelected(r) }).catch(() => {})
    return () => { alive = false }
  }, [findingId])
  const reco = useQuery(() => (key && !['index_guard', 'price_benchmark'].includes(key) ? getInbox(period, 3, key) : Promise.resolve(null)), [key, period.from, period.to, tick])

  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (!q.data) return <Skeleton lines={6} />
  const { row, config, layers, layerRuns, chart, stats, params } = q.data
  if (!row || !config || !key) return <EmptyState text={`No agent named ${key}.`} />
  const main = layerRuns[0]
  const flagship = config.chart === 'benchmark_cards'   // the flagship shows its own panel: a range, never one gap figure
  const run = async () => { setRunning(true); try { await runAgent(key, period) } finally { setRunning(false); refresh() } }
  const recoRows = reco.data?.rows ?? []
  const recoGap = recoRows.reduce((sum, r) => sum + r.gap_eur, 0)
  return (
    <section className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-prose">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">{config.module} · {periodLabel(period)}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{row.name}</h1>
          <p data-testid="agent-summary" className="mt-2 text-text-muted">{row.summary}</p>
          {!flagship && main && (
            <p data-tabular className="mt-3 text-sm">
              <span data-testid="kpi-gap" className="font-semibold text-brand">{formatEur(main.total)}</span>
              <span className="text-text-muted"> · <span data-testid="kpi-rows">{formatInt(main.rows)}</span> {copy.agent.findings.toLowerCase()} · {copy.cockpit.lastRun.toLowerCase()} <span data-testid="kpi-last-run">{main.finished_at ? new Date(main.finished_at).toLocaleString('en-GB') : copy.cockpit.notRun}</span></span>
            </p>
          )}
        </div>
        <Button variant="primary" data-testid="run-agent" loading={running} onClick={run}>{config.chart === 'benchmark_cards' ? copy.benchmark.runScan : copy.agent.run}</Button>
      </header>
      {flagship && <div data-testid="agent-chart"><PriceBenchmarkPanel runId={main?.id ?? null} finishedAt={main?.finished_at ?? null} /></div>}
      {!flagship && <>
      {reco.data && (
        <section aria-labelledby="agent-reco">
          <h2 id="agent-reco" className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.reduced.agentRecoTitle(row.name)}</h2>
          <div className="mt-3">
            <ActionInbox testId="agent-inbox" rows={recoRows} loading={reco.loading && !reco.data} error={reco.error} search={search} showAgent={false}
              restCount={Math.max(0, reco.data.count - recoRows.length)} restTotal={Math.max(0, reco.data.total - recoGap)} />
          </div>
        </section>
      )}
      {config.chart === 'index_basket' && <div data-testid="agent-chart"><IndexGuardPanel lineRun={main ?? null} contractsRun={layerRuns[1] ?? null} onOpen={setSelected} /></div>}
      <section aria-labelledby="agent-findings">
        <h2 id="agent-findings" className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.reduced.allFindings}</h2>
        {!main && <div className="mt-3"><EmptyState text={copy.agent.noRun} /></div>}
        {layerRuns.map((r, i) => <Findings key={r.id} run={r} label={layers.length > 1 ? layers[i].label : undefined} testId={`register-${key}-${i}`} onRow={i === 0 || key === 'index_guard' ? setSelected : undefined} selectedId={selected?.id} live={live} revealIds={revealIds} />)}
      </section>
      <Fold summary={copy.reduced.howTitle} testId="agent-how">
        {config.chart !== 'index_basket' && (
          <div data-testid="agent-chart" className="mb-4">
            {config.chart === 'tier_columns' && Boolean(stats.tier_share_by_year) && <TierYearChart data={stats.tier_share_by_year as TierYear[]} />}
            {main && config.chart === 'contract_table' && <ContractTable rows={chart.contracts ?? []} total={main.total} />}
            {main && config.chart === 'bridge' && <TermsBridge data={chart.bridge ?? null} rate={cfgValue(params, 'financing_rate')} day={cfgValue(params, 'skonto_days')} />}
          </div>
        )}
        <HowPanel row={row} params={params} />
      </Fold>
      </>}
      {selected && <EvidenceDrawer row={selected} period={period} onClose={() => setSelected(null)} onStatus={(st) => { setSelected({ ...selected, status: st }); setLive((n) => n + 1) }} />}
    </section>
  )
}
