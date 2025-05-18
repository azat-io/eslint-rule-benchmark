import type { Bench } from 'tinybench'
import type { ESLint } from 'eslint'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as CreateBenchModule from '../../../core/benchmark/create-bench'
import type { BenchmarkConfig } from '../../../types/benchmark-config'
import type { TestCase } from '../../../types/test-case'

import { createESLintInstance } from '../../../core/eslint/create-eslint-instance'
import { runBenchmark } from '../../../core/benchmark/run-benchmark'
import { createBench } from '../../../core/benchmark/create-bench'

vi.mock('../../../core/eslint/create-eslint-instance', () => ({
  createESLintInstance: vi.fn().mockResolvedValue({
    lintText: vi.fn().mockResolvedValue([{ warningCount: 0, errorCount: 0 }]),
  } as unknown as ESLint),
}))

vi.mock('../../../core/benchmark/create-bench', async importOriginal => {
  let orig = await importOriginal<typeof CreateBenchModule>()

  return {
    ...orig,
    createBench: vi.fn().mockImplementation(() => {
      let addedTasks: { fn(): Promise<void>; name: string }[] = []
      return {
        run: vi.fn(async () => {
          await Promise.all(addedTasks.map(task => task.fn()))
          return addedTasks.map(task => ({
            name: task.name,
          }))
        }),
        add: vi.fn((name: string, function_: () => Promise<void>) => {
          addedTasks.push({ fn: function_, name })
        }),
        opts: { warmupIterations: 0, iterations: 1, warmupTime: 0, time: 0 },
        get tasks() {
          return addedTasks
        },
      }
    }),
  }
})

let testCase: TestCase
let config: BenchmarkConfig
let configDirectory: string

describe('runBenchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(console, 'warn').mockImplementation(() => {})

    testCase = {
      samples: [
        { language: 'javascript', code: 'const a = 1;', filename: 'a.js' },
      ],
      rule: { ruleId: 'demo', severity: 2 },
      name: 'Sample case',
      iterationCount: 1,
      id: 'id-1',
    }

    config = {
      warmup: { enabled: false, iterations: 0 },
      reporters: [{ format: 'console' }],
      timeout: 1000,
      name: 'Bench',
      iterations: 5,
    }

    configDirectory = 'benchmark/config'
  })

  it('creates Bench with proper options and adds tasks for every sample', async () => {
    await runBenchmark({ testCases: [testCase], configDirectory, config })

    expect(createBench).toHaveBeenCalledWith({
      warmupIterations: config.warmup.iterations,
      iterations: config.iterations,
      warmup: config.warmup.enabled,
      timeoutMs: config.timeout,
    })

    let benchInstance = vi.mocked(createBench).mock.results[0]!.value as Bench
    expect(benchInstance.add).toHaveBeenCalledTimes(testCase.samples.length)
    for (let sample of testCase.samples) {
      expect(benchInstance.add).toHaveBeenCalledWith(
        `${testCase.name} on ${sample.filename}`,
        expect.any(Function),
      )
    }
  })

  it('returns array of task results', async () => {
    let tasks = await runBenchmark({
      testCases: [testCase],
      configDirectory,
      config,
    })
    let expectedTaskResults = testCase.samples.map(sample => ({
      name: `${testCase.name} on ${sample.filename}`,
    }))
    expect(tasks).toEqual(expectedTaskResults)
  })

  it('returns null if no test cases are provided', async () => {
    let tasks = await runBenchmark({ configDirectory, testCases: [], config })
    expect(tasks).toBeNull()
  })

  it('returns null if test cases have no samples or no runnable tasks are added', async () => {
    testCase.samples = []
    let tasks = await runBenchmark({
      testCases: [testCase],
      configDirectory,
      config,
    })
    expect(tasks).toBeNull()
  })

  it('calls createESLintInstance for each TestCase and lintText for each sample + warmup', async () => {
    let anotherTestCase: TestCase = {
      ...testCase,
      samples: [
        { language: 'typescript', code: 'let b = 2;', filename: 'b.ts' },
      ],
      name: 'Another Case',
      id: 'id-2',
    }
    let testCases = [testCase, anotherTestCase]

    let mockLintTextSpy1 = vi
      .fn()
      .mockResolvedValue([{ warningCount: 0, errorCount: 0 }])
    let mockESLintInstance1 = {
      lintText: mockLintTextSpy1,
    } as unknown as ESLint

    let mockLintTextSpy2 = vi
      .fn()
      .mockResolvedValue([{ warningCount: 0, errorCount: 0 }])
    let mockESLintInstance2 = {
      lintText: mockLintTextSpy2,
    } as unknown as ESLint

    vi.mocked(createESLintInstance)
      .mockResolvedValueOnce(mockESLintInstance1)
      .mockResolvedValueOnce(mockESLintInstance2)

    await runBenchmark({ configDirectory, testCases, config })

    expect(createESLintInstance).toHaveBeenCalledTimes(testCases.length)

    expect(createESLintInstance).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ rule: testCases[0]!.rule }),
    )
    expect(mockLintTextSpy1).toHaveBeenCalledTimes(
      testCases[0]!.samples.length + 1,
    )
    expect(mockLintTextSpy1).toHaveBeenCalledWith('/* eslint-disable */')
    for (let sample of testCases[0]!.samples) {
      expect(mockLintTextSpy1).toHaveBeenCalledWith(sample.code, {
        filePath: sample.filename,
      })
    }

    expect(createESLintInstance).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ rule: testCases[1]!.rule }),
    )
    expect(mockLintTextSpy2).toHaveBeenCalledTimes(
      testCases[1]!.samples.length + 1,
    )
    expect(mockLintTextSpy2).toHaveBeenCalledWith('/* eslint-disable */')
    for (let sample of testCases[1]!.samples) {
      expect(mockLintTextSpy2).toHaveBeenCalledWith(sample.code, {
        filePath: sample.filename,
      })
    }
  })

  it('handles error from createESLintInstance gracefully and continues', async () => {
    let error = new Error('boom')
    vi.mocked(createESLintInstance).mockRejectedValueOnce(error)
    vi.mocked(createESLintInstance).mockResolvedValueOnce({
      lintText: vi.fn().mockResolvedValue([{ warningCount: 0, errorCount: 0 }]),
    } as unknown as ESLint)

    let consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    let consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let anotherTestCase: TestCase = {
      ...testCase,
      name: 'Good Case',
      id: 'id-2',
    }
    let tasks = await runBenchmark({
      testCases: [testCase, anotherTestCase],
      configDirectory,
      config,
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Failed to create ESLint instance for TestCase "${testCase.name}": ${error.message}`,
      ),
    )
    expect(tasks).toBeInstanceOf(Array)
    expect(tasks!).toHaveLength(anotherTestCase.samples.length)
    expect(tasks![0]!.name).toBe(
      `${anotherTestCase.name} on ${anotherTestCase.samples[0]!.filename}`,
    )

    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })
})
