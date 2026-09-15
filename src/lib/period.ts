import { createContext, useContext } from 'react'

export interface Period { from: string; to: string }
export const DEFAULT_PERIOD: Period = { from: '2026-01-01', to: '2026-12-31' }

const pad = (n: number) => String(n).padStart(2, '0')
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Presets: years, quarters and months of the selected year. Custom ranges come from the two date inputs.
export function presets(year: number): { label: string; period: Period; group: string }[] {
  const years = [2026, 2025, 2024].map((y) => ({ label: String(y), period: { from: `${y}-01-01`, to: `${y}-12-31` }, group: 'Year' }))
  const quarters = [1, 2, 3, 4].map((q) => ({ label: `Q${q} ${year}`, period: { from: `${year}-${pad((q - 1) * 3 + 1)}-01`, to: `${year}-${pad(q * 3)}-${lastDay(year, q * 3)}` }, group: 'Quarter' }))
  const months = MONTHS.map((m, i) => ({ label: `${m} ${year}`, period: { from: `${year}-${pad(i + 1)}-01`, to: `${year}-${pad(i + 1)}-${lastDay(year, i + 1)}` }, group: 'Month' }))
  return [...years, ...quarters, ...months]
}

export const periodKey = (p: Period) => `${p.from}_${p.to}`
export const periodLabel = (p: Period) => {
  const found = presets(Number(p.from.slice(0, 4))).find((x) => x.period.from === p.from && x.period.to === p.to)
  return found ? found.label : `${p.from} to ${p.to}`
}
export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

export const PeriodContext = createContext<{ period: Period; setPeriod: (p: Period) => void }>({ period: DEFAULT_PERIOD, setPeriod: () => {} })
export const usePeriod = () => useContext(PeriodContext)
