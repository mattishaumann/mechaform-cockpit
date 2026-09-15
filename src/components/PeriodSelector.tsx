import { useState } from 'react'
import { copy } from '../copy'
import { isValidDate, presets, usePeriod, type Period } from '../lib/period'
import { Button } from './Button'

const field = 'rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50'

export function PeriodSelector() {
  const { period, setPeriod } = usePeriod()
  const year = Number(period.from.slice(0, 4)) || 2026
  const list = presets(year)
  const current = list.find((p) => p.period.from === period.from && p.period.to === period.to)
  const [custom, setCustom] = useState<Period>(period)
  const [open, setOpen] = useState(!current)
  const apply = (e: React.FormEvent) => { e.preventDefault(); if (isValidDate(custom.from) && isValidDate(custom.to) && custom.from <= custom.to) setPeriod(custom) }
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="period-selector">
      <label htmlFor="period-preset" className="font-mono text-xs uppercase tracking-widest text-text-muted">{copy.period.label}</label>
      <select id="period-preset" className={field} value={current ? current.label : 'custom'}
        onChange={(e) => { const p = list.find((x) => x.label === e.target.value); if (p) { setPeriod(p.period); setOpen(false) } else setOpen(true) }}>
        {['Year', 'Quarter', 'Month'].map((g) => <optgroup key={g} label={g}>{list.filter((p) => p.group === g).map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}</optgroup>)}
        <option value="custom">{copy.period.custom}</option>
      </select>
      {open && (
        <form onSubmit={apply} className="flex items-center gap-2">
          <label className="sr-only" htmlFor="period-from">{copy.period.from}</label>
          <input id="period-from" type="date" className={field} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          <label className="sr-only" htmlFor="period-to">{copy.period.to}</label>
          <input id="period-to" type="date" className={field} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
          <Button type="submit" disabled={!(isValidDate(custom.from) && isValidDate(custom.to) && custom.from <= custom.to)}>{copy.period.apply}</Button>
        </form>
      )}
    </div>
  )
}
