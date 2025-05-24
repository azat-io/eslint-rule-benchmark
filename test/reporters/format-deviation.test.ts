import { describe, expect, it } from 'vitest'

import { formatDeviation } from '../../reporters/format-deviation'

describe('formatDeviation', () => {
  it('should format a positive deviation correctly', () => {
    let result = formatDeviation(123.456)
    expect(result).toBe('±123.456 ms')
  })

  it('should format zero deviation correctly', () => {
    let result = formatDeviation(0)
    expect(result).toBe('±0.000 ms')
  })
})
