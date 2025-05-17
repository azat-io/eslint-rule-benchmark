import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import type {
  SingleRuleResult,
  BenchmarkConfig,
  ReporterFormat,
} from '../../types/benchmark-config'

import { runReporters } from '../../reporters'

let markdownSpy = vi.fn()
let consoleSpy = vi.fn()
let jsonSpy = vi.fn()

vi.mock('../../reporters/markdown', () => ({
  markdownReporter: vi.fn(() => markdownSpy),
}))

vi.mock('../../reporters/console', () => ({
  consoleReporter: vi.fn(() => consoleSpy),
}))

vi.mock('../../reporters/json', () => ({
  jsonReporter: vi.fn(() => jsonSpy),
}))

describe('runReporters()', () => {
  let dummyResult: SingleRuleResult = {
    rule: { id: 'rule' },
    result: null,
  } as unknown as SingleRuleResult

  let baseConfig: BenchmarkConfig = {
    warmup: { enabled: false, iterations: 0 },
    iterations: 1,
    name: 'bench',
    reporters: [],
    timeout: 1,
  }

  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    markdownSpy.mockClear()
    consoleSpy.mockClear()
    jsonSpy.mockClear()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('calls all provided reporters', () => {
    let config: BenchmarkConfig = {
      ...baseConfig,
      reporters: [
        { format: 'markdown' },
        { format: 'json' },
        { format: 'console' },
      ],
    }

    runReporters(dummyResult, config)

    expect(markdownSpy).toHaveBeenCalledWith(dummyResult, config)
    expect(jsonSpy).toHaveBeenCalledWith(dummyResult, config)
    expect(consoleSpy).toHaveBeenCalledWith(dummyResult, config)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('continues if reporter throws an exception', () => {
    jsonSpy.mockImplementationOnce(() => {
      throw new Error('Boom!')
    })

    let config: BenchmarkConfig = {
      ...baseConfig,
      reporters: [
        { format: 'markdown' },
        { format: 'json' },
        { format: 'console' },
      ],
    }

    runReporters(dummyResult, config)

    expect(markdownSpy).toHaveBeenCalledWith(
      {
        rule: {
          id: 'rule',
        },
        result: null,
      },
      {
        reporters: [
          {
            format: 'markdown',
          },
          {
            format: 'json',
          },
          {
            format: 'console',
          },
        ],
        warmup: {
          enabled: false,
          iterations: 0,
        },
        iterations: 1,
        name: 'bench',
        timeout: 1,
      },
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      {
        rule: {
          id: 'rule',
        },
        result: null,
      },
      {
        reporters: [
          {
            format: 'markdown',
          },
          {
            format: 'json',
          },
          {
            format: 'console',
          },
        ],
        warmup: {
          enabled: false,
          iterations: 0,
        },
        iterations: 1,
        name: 'bench',
        timeout: 1,
      },
    )

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Error in reporter "json": Boom!/u),
    )
  })

  it('logs error and continues if reporter format is unknown', () => {
    let config: BenchmarkConfig = {
      ...baseConfig,
      reporters: [
        { format: 'markdown' },
        { format: 'xml' as ReporterFormat },
        { format: 'console' },
      ],
    }

    runReporters(dummyResult, config)

    expect(markdownSpy).toHaveBeenCalledWith(dummyResult, config)
    expect(consoleSpy).toHaveBeenCalledWith(dummyResult, config)

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /Error in reporter "xml": Unknown reporter format/u,
      ),
    )
  })
})
