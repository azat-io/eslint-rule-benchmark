import { describe, expect, it } from 'vitest'

import { formatMs } from '../../reporters/format-ms'

describe('formatMs', () => {
  it('should format a valid number as milliseconds', () => {
    expect(formatMs(1000)).toBe('1,000.000 ms')
    expect(formatMs(1234.5678)).toBe('1,234.568 ms')
  })

  it("should return 'N/A' for non-numeric or non-finite values", () => {
    expect(formatMs(undefined as unknown as number)).toBe('N/A')
    expect(formatMs(null as unknown as number)).toBe('N/A')
    expect(formatMs(Number.NaN)).toBe('N/A')
    expect(formatMs(Infinity)).toBe('N/A')
    expect(formatMs(-Infinity)).toBe('N/A')
  })
})
