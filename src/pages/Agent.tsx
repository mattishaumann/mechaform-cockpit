import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { HowPanel } from '../components/HowPanel'
import { IndexGuardPanel } from '../components/IndexGuardPanel'
import { PriceBenchmarkPanel } from '../components/PriceBenchmarkPanel'
import { indexLayerColumns } from '../lib/indexGuard'
import { Pill } from '../components/Pill'
import { columns, RegisterTable, type Column } from '../components/RegisterTable'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { ComparisonCards } from '../components/ComparisonCards'
import { ContractTable } from '../components/ContractTable'
import { PriceIndexChart } from '../components/PriceIndexChart'
import { TermsBridge } from '../components/TermsBridge'
import { TierYearChart, type TierYear } from '../components/TierYearChart'
import { copy } from '../copy'
import { AGENTS, type CaseKey } from '../lib/agents'
import { getCases, getConfig, getContractTable, getLatestRuns, getPriceIndex, getRegister, getStats, getTermsBridge, runAgent, subscribe, type BridgeRow, type ConfigRow, type ContractRow, type IndexRow, type RegisterRow, type RunRow } from '../lib/data'
import { formatConfidence, formatEur, formatInt } from '../lib/format'
import { getNames } from '../lib/names'
import { periodLabel, usePeriod } from '../lib/period'
import { useQuery } from '../lib/useQuery'

const PAGE = 50
const cfgValue = (params: ConfigRow[], k: string) => params.find((c) => c.key === k)?.value ?? 0
const layerColumns: Record<string, Column[]> = {
  'Contract Guard': [columns.order, columns.date, columns.article, columns.supplier, columns.quantity, columns.paid, columns.contractPrice, columns.gap, columns.recommendation, columns.status],
  'Tier Guard': [columns.order, columns.date, columns.article, columns.supplier, columns.quantity, columns.paid, columns.tierPrice, columns.gap, columns.recommendation, columns.status],
  'Tier Guard (annual volume)': [columns.article, columns.supplier, columns.volume, columns.baseline, columns.tierPrice, columns.gap, columns.recommendation, columns.status],
  'Terms Floor': [columns.supplier, columns.volume, columns.baseline, columns.target, columns.gap, columns.recommendation, columns.status],
  'Price Radar': [columns.article, columns.volume, columns.baseline, columns.target, columns.gap, columns.recommendation, columns.status],
  'Preferred Steering': [columns.article, columns.supplier, columns.volume, columns.baseline, columns.target, columns.gap, columns.recommendation, columns.status],
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
    const chart: { contracts?: ContractRow[]; bridge?: BridgeRow | null; index?: IndexRow[]; top?: RegisterRow[]; names?: Awaited<ReturnType<typeof getNames>> } = {}
    if (main && config?.chart === 'contract_table') chart.contracts = await getContractTable(main.id)
    if (main && config?.chart === 'bridge') chart.bridge = await getTermsBridge(main.id)
    if (main && config?.chart === 'indexed_line') chart.index = await getPriceIndex(main.id)
    if (main && config?.chart === 'comparison_cards') {
      chart.top = (await getRegister(main.id, 0, 3)).rows
      chart.names = await getNames([...new Set(chart.top.map((r) => r.supplier_no).filter((x): x is number => x != null))], [...new Set(chart.top.map((r) => r.article_no).filter((x): x is number => x != null))])
    }
    // thresholds shown in the explanation: the agent's own, plus the due days its tasks use
    const due = key === 'contract_guard' || key === 'tier_guard' ? ['due_days_po_correction', 'due_days_task'] : ['due_days_task']
    const params = (await getConfig()).filter((c) => c.case_key === key || due.includes(c.key))
    return { row, config, layers, layerRuns, chart, stats, params }
  }, [key, period.from, period.to, tick])
  useEffect(() => subscribe((r) => { setRevealIds((ids) => new Set(ids).add(r.id)); if (q.data?.layerRuns.some((x) => x.id === r.run_id)) setLive((n) => n + 1) }, (r) => { if (r.agent === key && r.status === 'done') refresh() }), [key, refresh, q.data?.layerRuns])
  useEffect(() => { setSelected(null) }, [period.from, period.to])

  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (!q.data) return <Skeleton lines={6} />
  const { row, config, layers, layerRuns, chart, stats, params } = q.data
  if (!row || !config || !key) return <EmptyState text={`No agent named ${key}.`} />
  const main = layerRuns[0]
  const flagship = config.chart === 'benchmark_cards'   // the flagship shows its own panel: a range, never one gap figure
  const run = async () => { setRunning(true); try { await runAgent(key, period) } finally { setRunning(false); refresh() } }
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Pill tone="brand">{config.module}</Pill>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{row.name}</h1>
          <p data-testid="agent-summary" className="mt-1 max-w-prose text-text-muted">{row.summary}</p>
          <p className="mt-1 text-sm text-text-muted">{periodLabel(period)}</p>
        </div>
        <Button variant="primary" data-testid="run-agent" loading={running} onClick={run}>{copy.agent.run}</Button>
      </div>
      {flagship && <div data-testid="agent-chart" className="mt-6"><PriceBenchmarkPanel runId={main?.id ?? null} /></div>}
      {!flagship && <>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-4"><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.table.gap}</dt><dd data-testid="kpi-gap" data-tabular className="mt-1 text-3xl font-semibold tracking-tight text-brand">{main ? formatEur(main.total) : copy.cockpit.notRun}</dd></div>
        <div className="rounded-lg border border-border bg-surface p-4"><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.findings}</dt><dd data-testid="kpi-rows" data-tabular className="mt-1 text-3xl font-semibold tracking-tight">{main ? formatInt(main.rows) : '0'}</dd></div>
        <div className="rounded-lg border border-border bg-surface p-4"><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.cockpit.lastRun}</dt><dd data-testid="kpi-last-run" className="mt-1 text-sm">{main?.finished_at ? new Date(main.finished_at).toLocaleString('en-GB') : copy.cockpit.notRun}</dd></div>
        <div className="rounded-lg border border-border bg-surface p-4"><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">Confidence</dt><dd className="mt-1 text-sm">{copy.cockpit.confidence(formatConfidence(row.confidence))}</dd></div>
      </dl>
      <div data-testid="agent-chart" className="mt-6">
        {config.chart === 'tier_columns' && Boolean(stats.tier_share_by_year) && <TierYearChart data={stats.tier_share_by_year as TierYear[]} />}
        {main && config.chart === 'contract_table' && <ContractTable rows={chart.contracts ?? []} total={main.total} />}
        {main && config.chart === 'bridge' && <TermsBridge data={chart.bridge ?? null} rate={cfgValue(params, 'financing_rate')} day={cfgValue(params, 'skonto_days')} />}
        {main && config.chart === 'indexed_line' && <PriceIndexChart rows={chart.index ?? []} />}
        {main && config.chart === 'comparison_cards' && <ComparisonCards rows={chart.top ?? []} names={chart.names ?? { suppliers: {}, articles: {} }} onRow={setSelected} />}
        {config.chart === 'index_basket' && <IndexGuardPanel runId={main?.id ?? null} />}
      </div>
      <HowPanel row={row} params={params} />
      {!main && <div className="mt-6"><EmptyState text={copy.agent.noRun} /></div>}
      {layerRuns.map((r, i) => <Findings key={r.id} run={r} label={layers.length > 1 ? layers[i].label : undefined} testId={`register-${key}-${i}`} onRow={i === 0 || key === 'index_guard' ? setSelected : undefined} selectedId={selected?.id} live={live} revealIds={revealIds} />)}
      </>}
      {selected && <EvidenceDrawer row={selected} period={period} onClose={() => setSelected(null)} onStatus={(st) => { setSelected({ ...selected, status: st }); setLive((n) => n + 1) }} />}
    </section>
  )
}
