import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { Pill } from '../components/Pill'
import { columns, RegisterTable, type Column } from '../components/RegisterTable'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { copy } from '../copy'
import { AGENTS, type CaseKey } from '../lib/agents'
import { getCases, getCaseTotals, getRegister, getStats, type RegisterRow } from '../lib/data'
import { TierYearChart, type TierYear } from '../components/TierYearChart'
import { formatConfidence, formatEur } from '../lib/format'
import { getNames } from '../lib/names'
import { useQuery } from '../lib/useQuery'

const PAGE = 50
const layerColumns: Record<string, Column[]> = {
  'Contract Guard': [columns.order, columns.article, columns.supplier, columns.quantity, columns.paid, columns.contractPrice, columns.gap],
  'Tier Guard': [columns.order, columns.article, columns.supplier, columns.quantity, columns.paid, columns.tierPrice, columns.gap],
  'Tier Guard (annual volume)': [columns.article, columns.supplier, columns.volume, columns.baseline, columns.tierPrice, columns.gap],
}

function Layer({ caseName, label, testId, onRow, selectedId }: { caseName: string; label?: string; testId: string; onRow?: (r: RegisterRow) => void; selectedId?: number }) {
  const [page, setPage] = useState(0)
  const q = useQuery(async () => {
    const [{ rows, count }, totals] = await Promise.all([getRegister(caseName, page, PAGE), getCaseTotals()])
    const names = await getNames([...new Set(rows.map((r) => r.supplier_no).filter((x): x is number => x != null))], [...new Set(rows.map((r) => r.article_no).filter((x): x is number => x != null))])
    return { rows, count, names, total: totals.find((t) => t.case === caseName)?.total ?? 0 }
  }, [caseName, page])
  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (q.loading || !q.data) return <Skeleton lines={8} />
  if (q.data.count === 0) return <EmptyState text={`No flagged rows for ${caseName}.`} />
  return (
    <section className="mt-8">
      {label && <h2 className="mb-3 text-lg font-semibold">{label}</h2>}
      <RegisterTable rows={q.data.rows} cols={layerColumns[caseName] ?? [columns.article, columns.supplier, columns.volume, columns.baseline, columns.gap]} names={q.data.names}
        total={q.data.total} count={q.data.count} page={page} pageSize={PAGE} onPage={setPage} onRow={onRow} selectedId={selectedId} testId={testId} />
    </section>
  )
}

export function Agent() {
  const { key } = useParams<{ key: CaseKey }>()
  const cases = useQuery(getCases, [])
  const stats = useQuery(getStats, [])
  const [selected, setSelected] = useState<RegisterRow | null>(null)
  const row = cases.data?.find((c) => c.case_key === key)
  if (cases.error) return <ErrorState text={copy.cockpit.error} detail={cases.error} />
  if (cases.loading) return <Skeleton lines={5} />
  if (!row || !key || !(key in AGENTS)) return <EmptyState text={`No agent named ${key}.`} />
  const config = AGENTS[key]
  const layers = config.layers ?? [{ key: row.name, label: undefined as string | undefined }]
  return (
    <section>
      <Pill tone="brand">{config.module}</Pill>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{row.name}</h1>
      <p className="mt-2 max-w-prose text-text-muted">{row.rule}</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4"><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.table.gap}</dt><dd data-tabular className="mt-1 text-3xl font-semibold tracking-tight text-brand">{formatEur(row.value_2026)}</dd></div>
        <div className="rounded-lg border border-border bg-surface p-4"><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.trigger}</dt><dd className="mt-1 text-sm">{row.trigger}</dd></div>
        <div className="rounded-lg border border-border bg-surface p-4"><dt className="font-mono text-xs uppercase tracking-widest text-text-muted">Confidence</dt><dd className="mt-1 text-sm">{copy.cockpit.confidence(formatConfidence(row.confidence))}</dd></div>
      </dl>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4 text-sm"><p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.evidence}</p><p className="mt-1">{row.evidence_required}</p></div>
        <div className="rounded-lg border border-border bg-surface p-4 text-sm"><p className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.action}</p><p className="mt-1">{row.customer_action}</p></div>
      </div>
      <p className="mt-4 text-sm text-text-muted"><span className="font-mono text-xs uppercase tracking-widest">{copy.agent.workedExample}</span> {row.calculation}</p>
      {Boolean(config.extras?.includes('tier_year_chart') && stats.data?.tier_share_by_year) && <div className="mt-6"><TierYearChart data={stats.data.tier_share_by_year as TierYear[]} /></div>}
      {layers.map((l, i) => <Layer key={l.key} caseName={l.key} label={config.layers ? l.label : undefined} testId={`register-${key}-${i}`} onRow={i === 0 ? setSelected : undefined} selectedId={selected?.id} />)}
      {selected && <EvidenceDrawer row={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
