import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { formatTable } from '../../../reporters/console/format-table'

vi.mock('picocolors', () => ({
  default: {
    yellow: (text: string) => text,
    green: (text: string) => text,
    cyan: (text: string) => text,
    bold: (text: string) => text,
    red: (text: string) => text,
  },
}))

describe('formatTable', () => {
  beforeEach(() => {
    process.env['FORCE_COLOR'] = '0'
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    delete process.env['FORCE_COLOR']
    vi.restoreAllMocks()
  })

  it('should format the table correctly', () => {
    let result = formatTable({
      summary: {
        totalSamples: 1000,
        medianTimeMs: 200,
        totalWarnings: 10,
        meanTimeMs: 100,
        maxTimeMs: 300,
        totalErrors: 5,
        minTimeMs: 50,
      },
      rule: {
        id: 'rule-1',
      },
      benchmarkResults: [],
    })
    expect(result).toMatchSnapshot()
  })

  it('should handle undefined values correctly', () => {
    let result = formatTable({
      summary: {
        medianTimeMs: Number.NaN,
        meanTimeMs: Number.NaN,
        minTimeMs: Number.NaN,
        totalSamples: 1000,
        totalWarnings: 10,
        maxTimeMs: 300,
        totalErrors: 5,
      },
      rule: {
        id: 'rule-1',
      },
      benchmarkResults: [],
    })
    expect(result).toMatchSnapshot()
  })
})
