import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

import type { SingleRuleResult } from '../../../runners/run-single-rule'
import type { BenchmarkConfig } from '../../../types/benchmark-config'
import type { ReporterOptions } from '../../../types/benchmark-config'

import { createJsonReporter, jsonReporter } from '../../../reporters/json'

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

describe('jSON Reporter', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let mockResult: SingleRuleResult
  let mockConfig: BenchmarkConfig

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(mkdir).mockClear()
    vi.mocked(writeFile).mockClear()

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
          format: 'json',
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

  describe('createJsonReporter', () => {
    it('should create a reporter function', () => {
      let reporter = createJsonReporter({
        format: 'json',
      })

      expect(reporter).toBeInstanceOf(Function)
      expect(reporter).toHaveLength(2)
    })

    it('should save JSON report to file with default path', async () => {
      let mockToISOString = vi
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2021-01-01T00:00:00.000Z')

      let reporter = createJsonReporter({
        format: 'json',
      })

      reporter(mockResult, mockConfig)
      await setTimeout()

      expect(mkdir).toHaveBeenCalledWith('report', { recursive: true })

      expect(writeFile).toHaveBeenCalledWith(
        'report/benchmark-2021-01-01T00-00-00.000Z.json',
        expect.any(String),
        'utf8',
      )

      let jsonString = vi.mocked(writeFile).mock.calls[0]?.[1]
      let jsonContent = JSON.parse(jsonString as string) as Record<
        string,
        unknown
      >

      expect(jsonContent).toMatchObject({
        config: {
          warmup: {
            enabled: true,
            iterations: 3,
          },
          name: 'test-benchmark',
          iterations: 10,
          timeout: 5000,
        },
        summary: expect.objectContaining({
          medianTimeMs: 200,
          meanTimeMs: 100,
        }) as Record<string, number>,
        timestamp: '2021-01-01T00:00:00.000Z',
        rule: { id: 'test-rule' },
      })

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('JSON report saved to:'),
      )

      mockToISOString.mockRestore()
    })

    it('should use custom output path when provided', async () => {
      let reporter = createJsonReporter({
        outputPath: 'custom/path/report.json',
        format: 'json',
      })

      reporter(mockResult, mockConfig)
      await setTimeout()

      expect(mkdir).toHaveBeenCalledWith('custom/path', { recursive: true })
      expect(writeFile).toHaveBeenCalledWith(
        'custom/path/report.json',
        expect.any(String),
        'utf8',
      )
    })

    it('should handle errors when saving the file', async () => {
      vi.mocked(writeFile).mockRejectedValueOnce(
        new Error('Failed to write file'),
      )

      let reporter = createJsonReporter({
        format: 'json',
      })

      reporter(mockResult, mockConfig)
      await setTimeout()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save JSON report'),
      )
    })
  })

  describe('jsonReporter', () => {
    it('should return a reporter function', () => {
      let options: ReporterOptions = {
        format: 'json',
      }

      let reporter = jsonReporter(options)
      expect(reporter).toBeInstanceOf(Function)
    })
  })
})
