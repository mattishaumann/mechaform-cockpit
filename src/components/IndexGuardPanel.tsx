import { useMemo, useState } from 'react'
import { CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getIndexData, getIndexSummary, type BasketWeight, type IndexDefinition, type IndexPoint, type IndexSummaryRow } from '../lib/indexGuard'
import { formatEur } from '../lib/format'
import { useQuery } from '../lib/useQuery'
import { copy } from '../copy'
import { Button } from './Button'
import { Fold } from './Fold'
import { Pill } from './Pill'
import { EmptyState, ErrorState, Skeleton } from './States'

const label = 'font-mono text-xs uppercase tracking-widest text-text-muted'
const one = (v: unknown) => Number(v).toFixed(1)

// The sample notice sits above everything the agent shows: the index values are generated, not published.
function SampleBanner({ sample }: { sample: boolean }) {
  return (
    <div role="note" data-testid="index-sample-banner" data-sample={sample} className="rounded-lg border border-brand bg-brand-tint p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="brand">{sample ? copy.index.samplePill : copy.index.feedPill}</Pill>
        <p className="text-sm font-medium">{sample ? copy.index.sampleTitle : copy.index.feedTitle}</p>
      </div>
      {sample && <>
        <p className="mt-2 max-w-prose text-sm text-text-muted">{copy.index.sampleLead}</p>
        <div className="mt-2"><Fold summary={copy.index.sampleMore}><p className="max-w-prose text-text-muted">{copy.index.sampleText}</p></Fold></div>
      </>}
    </div>
  )
}

// Paid prices against the cost basket for one category, both as index on the pairs' base-year price = 100.
function CategoryChart({ rows }: { rows: IndexSummaryRow[] }) {
  const data = rows.map((r) => ({ month: r.month.slice(0, 7), paid: r.paid_index, basket: r.basket_index }))
  const last = data.length - 1
  if (data.length === 0) return <EmptyState text={copy.charts.noRun} />
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 56, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
          <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} width={40} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => String(Math.round(Number(v)))} />
          <Tooltip formatter={(v, name) => [one(v), name === 'paid' ? copy.index.paidSeries : copy.index.basketSeries]} contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
          <Legend verticalAlign="bottom" iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-text-muted">{v === 'paid' ? copy.index.paidSeries : copy.index.basketSeries}</span>} />
          <Line dataKey="paid" stroke="var(--color-brand)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-brand)', stroke: 'var(--color-surface)', strokeWidth: 1 }} isAnimationActive={false}>
            <LabelList dataKey="paid" content={({ x, y, index, value }) => (index === last ? <text x={Number(x) + 8} y={Number(y) + 4} fontSize={12} fill="var(--color-text)">{one(value)}</text> : null)} />
          </Line>
          <Line dataKey="basket" stroke="var(--color-series-neutral)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false}>
            <LabelList dataKey="basket" content={({ x, y, index, value }) => (index === last ? <text x={Number(x) + 8} y={Number(y) + 4} fontSize={12} fill="var(--color-text-muted)">{one(value)}</text> : null)} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Basket weights for the category with each index's value in January 2024 (= 100) and in the period's last month.
function BasketTable({ category, baskets, definitions, series, lastMonth }: { category: string; baskets: BasketWeight[]; definitions: IndexDefinition[]; series: IndexPoint[]; lastMonth: string | null }) {
  const own = baskets.filter((b) => b.category_no === category)
  const rows = (own.length ? own : baskets.filter((b) => b.category_no === '*'))
    .slice().sort((a, b) => a.material_type.localeCompare(b.material_type) || Number(a.component === 'FIXED') - Number(b.component === 'FIXED') || b.weight - a.weight)   // per material: indexed components by weight, fixed share last
  const name = (code: string) => (code === 'FIXED' ? copy.index.fixed : definitions.find((d) => d.index_code === code)?.name ?? code)
  const at = (code: string) => {
    if (code === 'FIXED' || !lastMonth) return null
    const pts = series.filter((p) => p.index_code === code && p.month <= lastMonth)
    return pts.length ? pts[pts.length - 1].value : null
  }
  const materials = [...new Set(rows.map((r) => r.material_type))]
  return (
    <div className="overflow-x-auto">
      <table data-testid="index-basket-table" className="w-full text-sm">
        <thead className="text-left font-mono text-xs uppercase tracking-widest text-text-muted">
          <tr><th scope="col" className="py-1 pr-4 font-normal">{copy.index.material}</th><th scope="col" className="py-1 pr-4 font-normal">{copy.index.component}</th><th scope="col" className="py-1 pr-4 text-right font-normal">{copy.index.weight}</th><th scope="col" className="py-1 pr-4 text-right font-normal">{copy.index.valueNow(lastMonth?.slice(0, 7) ?? '')}</th><th scope="col" className="py-1 font-normal">{copy.index.standsIn}</th></tr>
        </thead>
        <tbody>
          {materials.flatMap((m) => rows.filter((r) => r.material_type === m).map((r, i) => (
            <tr key={`${m}-${r.component}`} className="border-t border-border">
              <td className="py-1 pr-4 text-text-muted">{i === 0 ? m || copy.index.anyMaterial : ''}</td>
              <td className="py-1 pr-4">{name(r.component)}</td>
              <td className="py-1 pr-4 text-right tabular-nums">{Math.round(r.weight * 100)}%</td>
              <td className="py-1 pr-4 text-right tabular-nums">{at(r.component) == null ? '' : one(at(r.component))}</td>
              <td className="py-1 text-xs text-text-muted">{r.component === 'FIXED' ? copy.index.fixedNote : definitions.find((d) => d.index_code === r.component)?.stands_in_for ?? ''}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  )
}

export function IndexGuardPanel({ runId }: { runId: number | null }) {
  const q = useQuery(async () => {
    const [summary, idx] = await Promise.all([runId ? getIndexSummary(runId) : Promise.resolve([] as IndexSummaryRow[]), getIndexData()])
    return { summary, ...idx }
  }, [runId])
  const categories = useMemo(() => {
    const by = new Map<string, { name: string; spend: number; excess: number }>()
    for (const r of q.data?.summary ?? []) {
      const c = by.get(r.category_no) ?? { name: r.category_name ?? r.category_no, spend: 0, excess: 0 }
      c.spend += r.spend; c.excess += r.spend * (r.paid_index - r.basket_index) / Math.max(r.paid_index, 1)
      by.set(r.category_no, c)
    }
    return [...by.entries()].map(([no, c]) => ({ no, ...c })).sort((a, b) => b.excess - a.excess)
  }, [q.data?.summary])
  const [picked, setPicked] = useState<string | null>(null)

  if (q.error) return <ErrorState text={copy.cockpit.error} detail={q.error} />
  if (!q.data) return <Skeleton lines={6} />
  const sample = q.data.definitions.length === 0 || q.data.definitions.some((d) => d.is_sample)
  const current = picked ?? categories[0]?.no ?? null
  const rows = q.data.summary.filter((r) => r.category_no === current)
  const lastMonth = rows.length ? rows[rows.length - 1].month : null
  const cat = categories.find((c) => c.no === current)
  return (
    <div className="space-y-4">
      <SampleBanner sample={sample} />
      {!runId || categories.length === 0 ? <EmptyState text={copy.charts.noRun} /> : (
        <figure data-testid="index-guard-chart" className="rounded-lg border border-border bg-surface p-4">
          <figcaption className={label}>{copy.index.chartTitle}</figcaption>
          <div role="group" aria-label={copy.index.pickCategory} className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Button key={c.no} variant={c.no === current ? 'primary' : 'secondary'} aria-pressed={c.no === current} data-testid={`index-cat-${c.no}`} onClick={() => setPicked(c.no)}>{c.name}</Button>
            ))}
          </div>
          {cat && <p className="mt-3 text-sm text-text-muted">{copy.index.categoryLine(formatEur(cat.spend))}</p>}
          <div className="mt-2"><CategoryChart rows={rows} /></div>
          <p className={`${label} mt-6`}>{copy.index.basketTitle}</p>
          <div className="mt-2"><BasketTable category={current ?? '*'} baskets={q.data.baskets} definitions={q.data.definitions} series={q.data.series} lastMonth={lastMonth} /></div>
          <p className="mt-3 max-w-prose text-xs text-text-muted">{copy.index.chartNote}</p>
        </figure>
      )}
    </div>
  )
}
