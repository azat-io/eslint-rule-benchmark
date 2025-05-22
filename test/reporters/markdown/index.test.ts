import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

import type {
  SingleRuleResult,
  BenchmarkConfig,
} from '../../../types/benchmark-config'
import type { ProcessedBenchmarkTask } from '../../../core/benchmark/run-benchmark'
import type { BenchmarkMetrics } from '../../../types/benchmark-metrics'

import {
  createMarkdownReporter,
  markdownReporter,
} from '../../../reporters/markdown'

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

describe('markdown reporter', () => {
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
      reporters: [{ format: 'markdown' }],
      iterations: 10,
      timeout: 5000,
      name: 'bench',
    }
  })

  afterEach(() => vi.restoreAllMocks())

  describe('createMarkdownReporter()', () => {
    it('creates report function', () => {
      let reporter = createMarkdownReporter({ format: 'markdown' })
      expect(reporter).toBeInstanceOf(Function)
      expect(reporter).toHaveLength(2)
    })

    it('by default writes report to file', async () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(
        '2021-01-01T00:00:00.000Z',
      )

      let reporter = createMarkdownReporter({ format: 'markdown' })
      reporter(mockResult, mockConfig)

      await setTimeout()

      expect(fsMkdir).toHaveBeenCalledWith('report', { recursive: true })
      expect(fsWrite).toHaveBeenCalledWith(
        'report/benchmark-2021-01-01T00-00-00.000Z.md',
        expect.any(String),
        'utf8',
      )

      let saved = fsWrite.mock.calls[0]![1] as string

      expect(saved).toContain('# ESLint Rule Benchmark Report')
      expect(saved).toContain('## bench')
      expect(saved).toContain(`**Rule ID:** \`test-rule\``)
      expect(saved).toContain(`**Rule Path:** \`path/to/rule.js\``)
      expect(saved).toContain(
        `| Operations per second | ${mockProcessedTask.metrics.hz} |`,
      )
      expect(saved).toContain(
        `| Average time | ${mockProcessedTask.metrics.mean.toFixed(5)} ms |`,
      )
      expect(saved).toContain(
        `| Median time (P50) | ${mockProcessedTask.metrics.median.toFixed(5)} ms |`,
      )
      expect(saved).toContain(
        `| Minimum time | ${mockProcessedTask.metrics.min.toFixed(5)} ms |`,
      )
      expect(saved).toContain(
        `| Maximum time | ${mockProcessedTask.metrics.max.toFixed(5)} ms |`,
      )
      expect(saved).toContain(
        `| P75 Percentile | ${mockProcessedTask.metrics.p75.toFixed(5)} ms |`,
      )
      expect(saved).toContain(
        `| P99 Percentile | ${mockProcessedTask.metrics.p99.toFixed(5)} ms |`,
      )
      expect(saved).toContain(
        `| Standard deviation | ${mockProcessedTask.metrics.stdDev.toFixed(5)} ms |`,
      )
      expect(saved).toContain(
        `| Total samples | ${mockProcessedTask.metrics.sampleCount} |`,
      )
      expect(saved).not.toContain('Relative margin of error')
      expect(saved).not.toContain('99.5%')
      expect(saved).not.toContain('99.9%')
      expect(saved).not.toContain('## System Information')
      expect(saved).toContain('| Iterations | 10 |')

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Markdown report saved to:'),
      )
    })

    it('uses provided outputPath', async () => {
      let reporter = createMarkdownReporter({
        outputPath: 'custom/out/report.md',
        format: 'markdown',
      })

      reporter(mockResult, mockConfig)
      await setTimeout()

      expect(fsMkdir).toHaveBeenCalledWith('custom/out', { recursive: true })
      expect(fsWrite).toHaveBeenCalledWith(
        'custom/out/report.md',
        expect.any(String),
        'utf8',
      )
    })

    it('logs error if file fails to save', async () => {
      fsWrite.mockRejectedValueOnce(new Error('fail'))

      let reporter = createMarkdownReporter({ format: 'markdown' })
      reporter(mockResult, mockConfig)

      await setTimeout()

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save Markdown report'),
      )
    })
  })

  it('correctly handles absence of benchmark results', async () => {
    let resultWithoutBenchmark: SingleRuleResult = {
      rule: { path: 'path/to/rule.js', id: 'test-rule' },
      result: null,
    } as SingleRuleResult

    let reporter = createMarkdownReporter({ format: 'markdown' })

    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(
      '2021-01-01T00:00:00.000Z',
    )

    reporter(resultWithoutBenchmark, mockConfig)
    await setTimeout()

    expect(fsWrite).toHaveBeenCalledWith(
      'report/benchmark-2021-01-01T00-00-00.000Z.md',
      expect.any(String),
      'utf8',
    )

    let saved = fsWrite.mock.calls[0]![1] as string

    expect(saved).toContain('## Error')
    expect(saved).toContain('No benchmark results available')
    expect(saved).toContain('**Rule Path:** `path/to/rule.js`')
  })

  it('substitutes "N/A" for invalid time values', async () => {
    let mockTaskWithNaN = createMockProcessedTask({
      median: Infinity,
      mean: undefined,
      p75: Number.NaN,
    })
    let resultWithInvalidTimes: SingleRuleResult = {
      rule: { id: 'test-rule' },
      result: mockTaskWithNaN,
    }

    let reporter = createMarkdownReporter({ format: 'markdown' })
    reporter(resultWithInvalidTimes, mockConfig)

    await setTimeout()

    let saved = fsWrite.mock.calls[0]![1] as string

    expect(saved).toContain('| Average time | N/A |')
    expect(saved).toContain('| P75 Percentile | N/A |')
    expect(saved).toContain('| Median time (P50) | N/A |')
  })

  it('calls markdownReporter with correct parameters', async () => {
    let reporter = markdownReporter({ format: 'markdown' })
    reporter(mockResult, mockConfig)
    await setTimeout()

    expect(fsWrite).toHaveBeenCalledWith(
      expect.stringContaining('report/benchmark-'),
      expect.stringContaining('| Operations per second'),
      'utf8',
    )
  })
})
