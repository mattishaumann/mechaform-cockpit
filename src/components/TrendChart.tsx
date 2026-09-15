import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendRow } from '../lib/data'
import { formatEur } from '../lib/format'
import { MONTHS } from '../lib/period'
import { copy } from '../copy'

export function TrendChart({ rows, total }: { rows: TrendRow[]; total: number }) {
  const data = rows.map((r) => ({ label: `${MONTHS[new Date(r.month).getUTCMonth()]} ${String(new Date(r.month).getUTCFullYear()).slice(2)}`, total: r.total, value: formatEur(r.total) }))
  return (
    <figure data-testid="trend-chart" className="rounded-lg border border-border bg-surface p-4">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.trend}</span>
        <span data-testid="trend-total" data-tabular className="text-sm font-medium">{formatEur(total)}</span>
      </figcaption>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 0 }} barCategoryGap="25%">
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} interval={0} />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'var(--color-brand-tint)' }} formatter={(v) => formatEur(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }} />
            <Bar dataKey="total" fill="var(--color-brand)" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.length <= 12 && <LabelList dataKey="value" position="top" style={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
