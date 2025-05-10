import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { highlightImportantMetrics } from '../../../reporters/console/highlight-important-metrics'

vi.mock('picocolors', () => ({
  default: {
    yellow: (text: string) => text,
    green: (text: string) => text,
    cyan: (text: string) => text,
  },
}))

describe('highlightImportantMetrics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should highlight important metrics', () => {
    let result = highlightImportantMetrics({
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

  it('should highlight important metrics with custom slow threshold', () => {
    let result = highlightImportantMetrics(
      {
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
      },
      { slowThresholdMs: 150 },
    )
    expect(result).toMatchSnapshot()
  })

  it('should highlight important metrics with no warnings or errors', () => {
    let result = highlightImportantMetrics({
      summary: {
        totalSamples: 1000,
        medianTimeMs: 200,
        totalWarnings: 0,
        meanTimeMs: 50,
        maxTimeMs: 100,
        totalErrors: 0,
        minTimeMs: 50,
      },
      rule: {
        id: 'rule-1',
      },
      benchmarkResults: [],
    })
    expect(result).toMatchSnapshot()
  })
})
