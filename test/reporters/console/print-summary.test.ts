import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import * as highlightImportantMetricsModule from '../../../reporters/console/highlight-important-metrics'
import * as formatTableModule from '../../../reporters/console/format-table'
import { printSummary } from '../../../reporters/console/print-summary'

describe('printSummary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    vi.spyOn(formatTableModule, 'formatTable').mockReturnValue(
      'formatted-table',
    )

    vi.spyOn(
      highlightImportantMetricsModule,
      'highlightImportantMetrics',
    ).mockReturnValue(['highlight-1', 'highlight-2'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should print formatted table and highlights', () => {
    let mockResult = {
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
        id: 'test-rule',
      },
      benchmarkResults: [],
    }

    printSummary(mockResult)

    expect(formatTableModule.formatTable).toHaveBeenCalledWith(mockResult)

    expect(
      highlightImportantMetricsModule.highlightImportantMetrics,
    ).toHaveBeenCalledWith(
      mockResult,
      expect.objectContaining({ slowThresholdMs: 50 }),
    )

    expect(console.info).toHaveBeenCalledTimes(5)
  })

  it('should use custom slowThresholdMs if provided', () => {
    let mockResult = {
      summary: {
        totalSamples: 1000,
        medianTimeMs: 200,
        totalWarnings: 10,
        meanTimeMs: 100,
        maxTimeMs: 300,
        totalErrors: 5,
        minTimeMs: 50,
      },
      rule: { id: 'test-rule' },
      benchmarkResults: [],
    }

    printSummary(mockResult, { slowThresholdMs: 150 })

    expect(
      highlightImportantMetricsModule.highlightImportantMetrics,
    ).toHaveBeenCalledWith(
      mockResult,
      expect.objectContaining({ slowThresholdMs: 150 }),
    )
  })
})
