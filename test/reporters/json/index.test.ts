import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

import type {
  SingleRuleResult,
  BenchmarkConfig,
} from '../../../types/benchmark-config'
import type { ProcessedBenchmarkTask } from '../../../core/benchmark/run-benchmark'
import type { BenchmarkMetrics } from '../../../types/benchmark-metrics'

import { createJsonReporter, jsonReporter } from '../../../reporters/json'

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

let fsWrite = vi.mocked(writeFile)
let fsMkdir = vi.mocked(mkdir)

let createMockMetrics = (
  overrides: Partial<BenchmarkMetrics> = {},
): BenchmarkMetrics => ({
  sampleCount: 10,
  period: 0.001,
  stdDev: 0.05,
  median: 0.9,
  p75: 1.05,
  min: 0.8,
  max: 1.2,
  p99: 1.1,
  hz: 1000,
  mean: 1,
  ...overrides,
})

let createMockProcessedTask = (
  metricOverrides: Partial<BenchmarkMetrics> = {},
): ProcessedBenchmarkTask => ({
  metrics: createMockMetrics(metricOverrides),
  name: 'test-benchmark-task-name',
})

let mockProcessedTask: ProcessedBenchmarkTask
let mockResult: SingleRuleResult
let mockConfig: BenchmarkConfig

/* -------------------------------------------------------------------------- */

describe('jSON reporter', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    fsWrite.mockClear()
    fsMkdir.mockClear()

    mockProcessedTask = createMockProcessedTask()
    mockResult = {
      rule: { path: 'path/to/rule.js', id: 'test-rule' },
      result: mockProcessedTask,
    }

    mockConfig = {
      warmup: { enabled: true, iterations: 3 },
      reporters: [{ format: 'json' }],
      iterations: 10,
      timeout: 5000,
      name: 'bench',
    }
  })

  afterEach(() => vi.restoreAllMocks())

  describe('createJsonReporter()', () => {
    it('creates a reporter function', () => {
      let reporter = createJsonReporter({ format: 'json' })
      expect(reporter).toBeInstanceOf(Function)
      expect(reporter).toHaveLength(2)
    })

    it('writes a report to a file by default', async () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(
        '2021-01-01T00:00:00.000Z',
      )

      let reporter = createJsonReporter({ format: 'json' })
      reporter(mockResult, mockConfig)

      await setTimeout()

      expect(fsMkdir).toHaveBeenCalledWith('report', { recursive: true })
      expect(fsWrite).toHaveBeenCalledWith(
        'report/benchmark-2021-01-01T00-00-00.000Z.json',
        expect.any(String),
        'utf8',
      )

      let saved = JSON.parse(
        fsWrite.mock.calls[0]![1] as string,
      ) as SingleRuleResult

      expect(saved).toEqual({
        metrics: {
          standardDeviation: '0.05000 ms',
          operationsPerSecond: 1000,
          averageTime: '1.00000 ms',
          minimumTime: '0.80000 ms',
          maximumTime: '1.20000 ms',
          medianTime: '0.90000 ms',
          periodInSeconds: 0.001,
          p75: '1.05000 ms',
          p99: '1.10000 ms',
          totalSamples: 10,
        },
        config: {
          warmup: { enabled: true, iterations: 3 },
          iterations: 10,
          timeout: 5000,
          name: 'bench',
        },
        rule: { path: 'path/to/rule.js', id: 'test-rule' },
        timestamp: '2021-01-01T00:00:00.000Z',
      })

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('JSON report saved to:'),
      )
    })

    it('uses the specified outputPath', async () => {
      let reporter = createJsonReporter({
        outputPath: 'custom/out/report.json',
        format: 'json',
      })

      reporter(mockResult, mockConfig)
      await setTimeout()

      expect(fsMkdir).toHaveBeenCalledWith('custom/out', { recursive: true })
      expect(fsWrite).toHaveBeenCalledWith(
        'custom/out/report.json',
        expect.any(String),
        'utf8',
      )
    })

    it('logs an error if the file fails to save', async () => {
      fsWrite.mockRejectedValueOnce(new Error('fail'))

      let reporter = createJsonReporter({ format: 'json' })
      reporter(mockResult, mockConfig)

      await setTimeout()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save JSON report'),
      )
    })
  })

  it('handles missing benchmark results', async () => {
    let resultWithoutBenchmark: SingleRuleResult = {
      rule: { path: 'path/to/rule.js', id: 'test-rule' },
      result: null,
    }

    let reporter = createJsonReporter({ format: 'json' })

    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(
      '2021-01-01T00:00:00.000Z',
    )

    reporter(resultWithoutBenchmark, mockConfig)
    await setTimeout()

    expect(fsWrite).toHaveBeenCalledWith(
      'report/benchmark-2021-01-01T00-00-00.000Z.json',
      expect.any(String),
      'utf8',
    )

    let savedJson = JSON.parse(fsWrite.mock.calls[0]![1] as string) as object

    expect(savedJson).toEqual({
      config: {
        iterations: mockConfig.iterations,
        timeout: mockConfig.timeout,
        warmup: mockConfig.warmup,
        name: mockConfig.name,
      },
      rule: {
        path: 'path/to/rule.js',
        id: 'test-rule',
      },
      error: 'No benchmark results available',
      timestamp: '2021-01-01T00:00:00.000Z',
    })
  })

  it('correctly formats invalid time values', async () => {
    let mockTaskWithNaN = createMockProcessedTask({
      median: Infinity,
      mean: undefined,
      p75: Number.NaN,
    })

    let resultWithInvalidTimes: SingleRuleResult = {
      rule: { id: 'test-rule' },
      result: mockTaskWithNaN,
    }

    let reporter = createJsonReporter({ format: 'json' })
    reporter(resultWithInvalidTimes, mockConfig)

    await setTimeout()

    interface SavedJsonMetrics {
      standardDeviation: string | null
      operationsPerSecond: number
      averageTime: string | null
      minimumTime: string | null
      maximumTime: string | null
      medianTime: string | null
      periodInSeconds: number
      totalSamples: number
      p75: string | null
      p99: string | null
    }
    interface SavedReport {
      metrics: SavedJsonMetrics
    }

    let savedJson = JSON.parse(
      fsWrite.mock.calls[0]![1] as string,
    ) as SavedReport

    expect(savedJson.metrics.averageTime).toBeNull()
    expect(savedJson.metrics.medianTime).toBeNull()
    expect(savedJson.metrics.p75).toBeNull()
    expect(savedJson.metrics.operationsPerSecond).toBe(1000)
    expect(savedJson.metrics.minimumTime).toBe('0.80000 ms')
  })

  it('calls json reporter with correct parameters', async () => {
    let reporter = jsonReporter({ format: 'json' })
    reporter(mockResult, mockConfig)
    await setTimeout()
    expect(fsWrite).toHaveBeenCalledWith(
      expect.stringContaining('report/benchmark-'),
      expect.stringContaining('"metrics":'),
      'utf8',
    )
  })
})
