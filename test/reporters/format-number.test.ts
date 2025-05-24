import { describe, expect, it } from 'vitest'

import { formatNumber } from '../../reporters/format-number'

describe('formatNumber', () => {
  it('should format a valid number with thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567.89)).toBe('1,234,567.89')
    expect(formatNumber(-9876543.21)).toBe('-9,876,543.21')
  })

  it("should return 'N/A' for non-numeric or non-finite values", () => {
    expect(formatNumber(undefined as unknown as number)).toBe('N/A')
    expect(formatNumber(null as unknown as number)).toBe('N/A')
    expect(formatNumber(Number.NaN)).toBe('N/A')
    expect(formatNumber(Infinity)).toBe('N/A')
    expect(formatNumber(-Infinity)).toBe('N/A')
  })
})
