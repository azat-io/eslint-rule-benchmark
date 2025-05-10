import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import type { SingleRuleResult } from '../../../runners/run-single-rule'
import type { BenchmarkConfig } from '../../../types/benchmark-config'

import {
  createConsoleReporter,
  consoleReporter,
} from '../../../reporters/console'
import * as printSummaryModule from '../../../reporters/console/print-summary'

vi.mock('../../../reporters/console/print-summary', () => ({
  printSummary: vi.fn(),
}))

describe('console Reporter', () => {
  let mockResult: SingleRuleResult
  let mockConfig: BenchmarkConfig

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(printSummaryModule, 'printSummary')

    mockResult = {
      benchmarkResults: [
        {
          measurements: [
            { timestamp: 1609459200500, executionTimeMs: 500 },
            { timestamp: 1609459200800, executionTimeMs: 300 },
          ],
          testCaseId: 'test-case-1',
          startTime: 1609459200000,
          endTime: 1609459201000,
          totalTimeMs: 1000,
          aborted: false,
          errors: [],
        },
      ],
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
    }

    mockConfig = {
      reporters: [
        {
          format: 'console',
        },
      ],
      warmup: {
        enabled: true,
        iterations: 3,
      },
      name: 'test-benchmark',
      iterations: 10,
      timeout: 5000,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createConsoleReporter', () => {
    it('should create a reporter function', () => {
      let reporter = createConsoleReporter()

      expect(reporter).toBeInstanceOf(Function)
      expect(reporter).toHaveLength(2)
    })

    it('should call printSummary with correct arguments', () => {
      let reporter = createConsoleReporter()

      reporter(mockResult, mockConfig)

      expect(printSummaryModule.printSummary).toHaveBeenCalledWith(mockResult, {
        slowThresholdMs: mockConfig.timeout / 100,
      })
    })

    it('should calculate slowThresholdMs as 1% of timeout', () => {
      let customConfig = {
        ...mockConfig,
        timeout: 10000,
      }

      let reporter = createConsoleReporter()

      reporter(mockResult, customConfig)

      expect(printSummaryModule.printSummary).toHaveBeenCalledWith(
        mockResult,
        expect.objectContaining({
          slowThresholdMs: 100,
        }),
      )
    })
  })

  describe('consoleReporter', () => {
    it('should return a reporter function', () => {
      let reporter = consoleReporter()
      expect(reporter).toBeInstanceOf(Function)
    })
  })
})
