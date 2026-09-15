// English number format throughout (decision 2026-09-15). Whole euros for amounts, two decimals for unit prices.
const whole = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, minimumFractionDigits: 2 })
const plain = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 })

export const toNumber = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
export const formatEur = (v: unknown): string => whole.format(toNumber(v))
export const formatPrice = (v: unknown): string => cents.format(toNumber(v))
export const formatInt = (v: unknown): string => plain.format(toNumber(v))
export const formatPct = (v: unknown, digits = 0): string => `${(toNumber(v) * 100).toFixed(digits)}%`
export const formatConfidence = (v: unknown): string => toNumber(v).toFixed(2)
