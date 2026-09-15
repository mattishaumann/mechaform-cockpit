import { describe, expect, it } from 'vitest'
import { formatConfidence, formatEur, formatInt, formatPct, formatPrice } from '../lib/format'

describe('money and number formatting', () => {
  it('formats whole euros with thousands separators', () => {
    expect(formatEur(1530724.4)).toBe('€1,530,724')
    expect(formatEur('675529.41')).toBe('€675,529')
  })
  it('formats unit prices with two decimals', () => {
    expect(formatPrice(1038.9087)).toBe('€1,038.91')
    expect(formatPrice('866.6959')).toBe('€866.70')
  })
  it('formats counts, shares and confidence', () => {
    expect(formatInt(3351)).toBe('3,351')
    expect(formatPct(0.0409)).toBe('4%')
    expect(formatConfidence(0.9)).toBe('0.90')
  })
})
