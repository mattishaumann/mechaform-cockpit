import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { copy } from '../copy'
import { formatInt, formatPct } from '../lib/format'

export interface TierYear { year: number; above: number; eligible: number; share: number }

// Column chart of the share of eligible lines priced above the recorded tier, one column per year. Colours come from the token file.
export function TierYearChart({ data }: { data: TierYear[] }) {
  const rows = data.map((d) => ({ ...d, label: `${formatInt(d.above)} of ${formatInt(d.eligible)}`, pct: formatPct(d.share) }))
  const last = rows[rows.length - 1]?.year
  return (
    <figure data-testid="tier-year-chart" className="rounded-lg border border-border bg-surface p-4">
      <figcaption className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.agent.yearChart}</figcaption>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 28, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
            <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
            <YAxis hide domain={[0, 1]} />
            <Bar dataKey="share" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {rows.map((r) => <Cell key={r.year} fill={r.year === last ? 'var(--color-brand)' : 'var(--color-series-neutral)'} />)}
              <LabelList dataKey="pct" position="top" style={{ fill: 'var(--color-text)', fontSize: 14, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid grid-cols-3 text-center font-mono text-xs text-text-muted">
        {rows.map((r) => <li key={r.year}>{r.label}</li>)}
      </ul>
    </figure>
  )
}
