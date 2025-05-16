import { describe, expect, it } from 'vitest'

import { toSeverity } from '../../../core/eslint/to-severity'

describe('toSeverity', () => {
  it("should convert 0 to 'off'", () => {
    expect(toSeverity(0)).toBe('off')
  })

  it("should convert 1 to 'warn'", () => {
    expect(toSeverity(1)).toBe('warn')
  })

  it("should convert 2 to 'error'", () => {
    expect(toSeverity(2)).toBe('error')
  })
})
