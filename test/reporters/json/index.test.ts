import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

import type { SingleRuleResult } from '../../../runners/run-single-rule'
import type { BenchmarkConfig } from '../../../types/benchmark-config'

import { createJsonReporter, jsonReporter } from '../../../reporters/json'

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

let fsWrite = vi.mocked(writeFile)
let fsMkdir = vi.mocked(mkdir)

let tinybenchResult = {
  latency: {
    samples: [1, 1.1],
    rme: 1.11,
    p75: 1.05,
    p995: 1.1,
    p999: 1.1,
    sd: 0.05,
    min: 0.9,
    max: 1.1,
    p99: 1.1,
    mean: 1,
    p50: 1,
  },
  throughput: { mean: 1234 },
  runtimeVersion: 'v20.11.1',
  runtime: 'node',
  period: 0.001,
  totalTime: 2,
}

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

    mockResult = {
      result: { result: tinybenchResult },
      rule: { id: 'test-rule' },
    } as SingleRuleResult

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

      expect(saved).toEqual(
        expect.objectContaining({
          metrics: expect.objectContaining({
            averageTime: expect.stringMatching(/ms$/u) as string,
            operationsPerSecond: 1234,
          }) as Record<string, unknown>,
          config: expect.objectContaining({
            iterations: 10,
            timeout: 5000,
          }) as BenchmarkConfig,
          timestamp: '2021-01-01T00:00:00.000Z',
          rule: { id: 'test-rule' },
        }),
      )

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
    } as SingleRuleResult

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
    let resultWithInvalidTimes: SingleRuleResult = {
      result: {
        result: {
          ...tinybenchResult,
          latency: {
            ...tinybenchResult.latency,
            mean: undefined,
            p75: Number.NaN,
            p50: Infinity,
          },
        },
      },
      rule: { id: 'test-rule' },
    } as unknown as SingleRuleResult

    let reporter = createJsonReporter({ format: 'json' })
    reporter(resultWithInvalidTimes, mockConfig)

    await setTimeout()

    let savedJson = JSON.parse(fsWrite.mock.calls[0]![1] as string) as {
      metrics: {
        operationsPerSecond: number
        averageTime: string | null
        medianTime: string | null
        p75: string | null
      }
      config: BenchmarkConfig
      rule: { id: string }
    }

    expect(savedJson.metrics.averageTime).toBeNull()
    expect(savedJson.metrics.medianTime).toBeNull()
    expect(savedJson.metrics.p75).toBeNull()
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
