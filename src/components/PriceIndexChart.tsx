import { CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { IndexRow } from '../lib/data'
import { formatPct } from '../lib/format'
import { copy } from '../copy'
import { EmptyState } from './States'

const fmt = (v: unknown) => Number(v).toFixed(1)

// Price Radar's chart: the flagged articles' price index against the assumed path, 2024 = 100, one axis.
// The path is grey and dashed (an assumption, not data) and carries its own label; the table under the chart repeats every value.
export function PriceIndexChart({ rows }: { rows: IndexRow[] }) {
  if (rows.length < 2) return <EmptyState text={copy.charts.noRun} />
  const rate = formatPct(rows[0].index_rate, 1)
  const data = rows.map((r) => ({ year: String(r.year), articles: r.articles_index, path: r.path_index }))
  const last = data.length - 1
  return (
    <figure data-testid="price-index-chart" className="rounded-lg border border-border bg-surface p-4">
      <figcaption className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.charts.index}</figcaption>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} padding={{ left: 24, right: 24 }} />
            <YAxis domain={[98, 'auto']} tickLine={false} axisLine={false} width={40} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => String(Math.round(Number(v)))} />
            <Tooltip formatter={(v, name) => [fmt(v), name === 'articles' ? copy.charts.indexArticles : copy.charts.indexPath(rate)]} contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
            <Legend verticalAlign="bottom" iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} formatter={(v) => <span className="text-text-muted">{v === 'articles' ? copy.charts.indexArticles : copy.charts.indexPath(rate)}</span>} />
            <Line dataKey="articles" stroke="var(--color-brand)" strokeWidth={2} strokeLinecap="round" dot={{ r: 4, fill: 'var(--color-brand)', stroke: 'var(--color-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false}>
              <LabelList dataKey="articles" content={({ x, y, index, value }) => (index === last ? <text x={Number(x) + 10} y={Number(y) + 4} fontSize={12} fill="var(--color-text)">{fmt(value)}</text> : null)} />
            </Line>
            <Line dataKey="path" stroke="var(--color-series-neutral)" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: 'var(--color-series-neutral)', stroke: 'var(--color-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false}>
              <LabelList dataKey="path" content={({ x, y, index, value }) => (index === last ? <text x={Number(x) + 10} y={Number(y) + 4} fontSize={12} fill="var(--color-text-muted)">{fmt(value)}</text> : null)} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table data-testid="price-index-table" className="w-full text-sm">
          <thead className="text-left font-mono text-xs uppercase tracking-widest text-text-muted">
            <tr><th scope="col" className="py-1 pr-4 font-normal">{copy.charts.year}</th>{data.map((d) => <th key={d.year} scope="col" className="py-1 pr-4 text-right font-normal">{d.year}</th>)}</tr>
          </thead>
          <tbody>
            <tr className="border-t border-border"><th scope="row" className="py-1 pr-4 text-left font-normal">{copy.charts.indexArticles}</th>{data.map((d) => <td key={d.year} className="py-1 pr-4 text-right tabular-nums">{fmt(d.articles)}</td>)}</tr>
            <tr className="border-t border-border"><th scope="row" className="py-1 pr-4 text-left font-normal text-text-muted">{copy.charts.indexPath(rate)}</th>{data.map((d) => <td key={d.year} className="py-1 pr-4 text-right tabular-nums text-text-muted">{fmt(d.path)}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-prose text-xs text-text-muted">{copy.charts.indexNote}</p>
    </figure>
  )
}
