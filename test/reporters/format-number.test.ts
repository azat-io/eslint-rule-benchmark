import { describe, expect, it } from 'vitest'

import { formatNumber } from '../../reporters/format-number'

describe('formatNumber', () => {
  it('should format a valid number with thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567.89)).toBe('1,234,567.89')
    expect(formatNumber(-9876543.21)).toBe('-9,876,543.21')
  })

  it("should return 'N/A' for non-numeric or non-finite values", () => {
    expect(formatNumber(undefined)).toBe('N/A')
    // @ts-expect-error Verify runtime handling of a non-numeric value.
    expect(formatNumber(null)).toBe('N/A')
    expect(formatNumber(Number.NaN)).toBe('N/A')
    expect(formatNumber(Infinity)).toBe('N/A')
    expect(formatNumber(-Infinity)).toBe('N/A')
  })
})
