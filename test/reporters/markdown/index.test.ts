import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

import type {
  SingleRuleResult,
  BenchmarkConfig,
} from '../../../types/benchmark-config'

import { createMarkdownReporter } from '../../../reporters/markdown'
import { markdownReporter } from '../../../reporters/markdown'

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

describe('markdown reporter', () => {
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
      expect(saved).toContain('| Operations per second | 1234 |')
      expect(saved).toContain('| Iterations | 10 |')
      expect(saved).toContain('**Rule ID:** `test-rule`')

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
