import type { ESLint } from 'eslint'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as CreateBenchModule from '../../../core/benchmark/create-bench'
import type { TestRunResult, TestCase } from '../../../types/test-case'
import type { BenchmarkConfig } from '../../../types/benchmark-config'

import { createESLintInstance } from '../../../core/eslint/create-eslint-instance'
import { runBenchmark } from '../../../core/benchmark/run-benchmark'
import { createBench } from '../../../core/benchmark/create-bench'

vi.mock('../../../core/eslint/create-eslint-instance', () => ({
  createESLintInstance: vi.fn().mockResolvedValue({
    lintText: vi.fn().mockResolvedValue([
      {
        fixableWarningCount: 1,
        fixableErrorCount: 0,
        warningCount: 2,
        errorCount: 1,
      },
    ]),
  }),
}))

vi.mock('../../../core/benchmark/create-bench', async importOriginal => {
  let originalModule = await importOriginal<typeof CreateBenchModule>()

  return {
    ...originalModule,
    createBench: vi.fn().mockImplementation(() => {
      let taskStore: Record<string, () => Promise<void>> = {}

      return {
        run: vi.fn().mockImplementation(async () => {
          await Promise.all(
            Object.values(taskStore).map(async task => await task()),
          )
          return []
        }),
        opts: {
          warmupIterations: 0,
          iterations: 1,
          warmupTime: 0,
          time: 100,
        },
        add: vi.fn((name: string, task: () => Promise<void>) => {
          taskStore[name] = task
        }),
      }
    }),
  }
})

describe('runBenchmark', () => {
  let testCase: TestCase
  let config: BenchmarkConfig
  let onTestStart: ReturnType<typeof vi.fn>
  let onTestComplete: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    testCase = {
      samples: [
        {
          code: 'const x = 1;',
          filename: 'test.js',
        },
        {
          filename: 'test2.js',
          code: 'const y = 2;',
        },
      ],
      rule: {
        ruleId: 'test-rule',
        severity: 2,
      },
      name: 'Test Case 1',
      id: 'test-case-1',
      iterationCount: 5,
    }

    config = {
      reporters: [
        {
          format: 'console',
        },
      ],
      warmup: {
        enabled: true,
        iterations: 2,
      },
      name: 'Test Benchmark',
      iterations: 10,
      timeout: 1000,
    }

    onTestStart = vi.fn()
    onTestComplete = vi.fn()

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100)
      .mockReturnValueOnce(1200)
  })

  it('should create benchmark instance with correct parameters', async () => {
    await runBenchmark({
      testCases: [testCase],
      onTestComplete,
      onTestStart,
      config,
    })

    expect(onTestStart).toHaveBeenCalledWith(testCase)
    expect(createBench).toHaveBeenCalledWith({
      warmupIterations: config.warmup.iterations,
      iterations: config.iterations,
      warmup: config.warmup.enabled,
      timeoutMs: config.timeout,
    })
  })

  it('should call onTestStart for each test case', async () => {
    await runBenchmark({
      testCases: [testCase],
      onTestComplete,
      onTestStart,
      config,
    })

    expect(onTestStart).toHaveBeenCalledWith(testCase)
    expect(onTestStart).toHaveBeenCalledTimes(1)
  })

  it('should call onTestComplete after testing', async () => {
    let capturedResult: TestRunResult | undefined
    let customOnTestComplete = vi.fn((result: TestRunResult) => {
      capturedResult = result
    })

    await runBenchmark({
      onTestComplete: customOnTestComplete,
      testCases: [testCase],
      onTestStart,
      config,
    })

    expect(customOnTestComplete).toHaveBeenCalledTimes(1)
    expect(capturedResult).toBeDefined()
    expect(capturedResult?.testCaseId).toBe(testCase.id)
  })

  it('should aggregate ESLint results from all code samples', async () => {
    let lintTextMock = vi
      .fn()
      .mockResolvedValueOnce([
        {
          fixableWarningCount: 0,
          fixableErrorCount: 0,
          warningCount: 0,
          errorCount: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          fixableWarningCount: 1,
          fixableErrorCount: 0,
          warningCount: 2,
          errorCount: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          fixableWarningCount: 0,
          fixableErrorCount: 1,
          warningCount: 1,
          errorCount: 2,
        },
      ])

    vi.mocked(createESLintInstance).mockResolvedValue({
      lintText: lintTextMock,
    } as unknown as ESLint)

    let capturedResult: TestRunResult | undefined
    let customOnTestComplete = vi.fn((result: TestRunResult) => {
      capturedResult = result
    })

    await runBenchmark({
      onTestComplete: customOnTestComplete,
      testCases: [testCase],
      onTestStart,
      config,
    })

    expect(capturedResult).toBeDefined()
    expect(capturedResult?.eslintResults?.errorCount).toBe(3)
    expect(capturedResult?.eslintResults?.warningCount).toBe(3)
    expect(capturedResult?.eslintResults?.fixableErrorCount).toBe(1)
    expect(capturedResult?.eslintResults?.fixableWarningCount).toBe(1)
  })

  it('should handle errors when running ESLint', async () => {
    let testError = new Error('Test ESLint error')
    vi.mocked(createESLintInstance).mockRejectedValue(testError)

    let capturedResult: TestRunResult | undefined
    let customOnTestComplete = vi.fn((result: TestRunResult) => {
      capturedResult = result
    })

    await runBenchmark({
      onTestComplete: customOnTestComplete,
      testCases: [testCase],
      onTestStart,
      config,
    })

    expect(customOnTestComplete).toHaveBeenCalledTimes(1)
    expect(capturedResult).toBeDefined()
    expect(capturedResult?.aborted).toBeTruthy()
    expect(capturedResult?.errors?.[0]).toBe(testError.message)
  })

  it('should return results array for all test cases', async () => {
    let testCases = [
      testCase,
      {
        ...testCase,
        name: 'Test Case 2',
        id: 'test-case-2',
      },
    ]

    let results = await runBenchmark({
      onTestComplete,
      onTestStart,
      testCases,
      config,
    })

    expect(results).toHaveLength(2)
    expect(results[0]?.testCaseId).toBe(testCases[0]?.id)
    expect(results[1]?.testCaseId).toBe(testCases[1]?.id)
  })
})
