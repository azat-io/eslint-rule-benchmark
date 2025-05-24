import { describe, expect, it } from 'vitest'

import { formatHz } from '../../reporters/format-hz'

describe('formatHz', () => {
  it('should format a valid number as ops/sec', () => {
    expect(formatHz(1000)).toBe('1,000 ops/sec')
    expect(formatHz(1234.5678)).toBe('1,235 ops/sec')
  })

  it("should return 'N/A' for non-numeric or non-finite values", () => {
    expect(formatHz(undefined as unknown as number)).toBe('N/A')
    expect(formatHz(null as unknown as number)).toBe('N/A')
    expect(formatHz(Number.NaN)).toBe('N/A')
    expect(formatHz(Infinity)).toBe('N/A')
    expect(formatHz(-Infinity)).toBe('N/A')
  })
})
