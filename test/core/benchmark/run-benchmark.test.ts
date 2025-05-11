import type { Bench } from 'tinybench'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreateESLintInstanceOptions } from '../../../core/eslint/create-eslint-instance'
import type * as CreateBenchModule from '../../../core/benchmark/create-bench'
import type { BenchmarkConfig } from '../../../types/benchmark-config'
import type { TestCase } from '../../../types/test-case'

import { createESLintInstance } from '../../../core/eslint/create-eslint-instance'
import { runBenchmark } from '../../../core/benchmark/run-benchmark'
import { createBench } from '../../../core/benchmark/create-bench'

vi.mock('../../../core/eslint/create-eslint-instance', () => ({
  createESLintInstance: vi.fn().mockResolvedValue({
    lintText: vi.fn().mockResolvedValue([{ warningCount: 0, errorCount: 0 }]),
  }),
}))

vi.mock('../../../core/benchmark/create-bench', async importOriginal => {
  let orig = await importOriginal<typeof CreateBenchModule>()

  return {
    ...orig,
    createBench: vi.fn().mockImplementation(() => {
      let tasks: Record<string, () => Promise<void>> = {}

      return {
        run: vi.fn(async () => {
          await Promise.all(Object.values(tasks).map(t => t()))
          return Object.keys(tasks).map(name => ({ name }))
        }),
        add: vi.fn((name: string, function_: () => Promise<void>) => {
          tasks[name] = function_
        }),
        opts: { warmupIterations: 0, iterations: 1, warmupTime: 0, time: 0 },
      }
    }),
  }
})

let testCase: TestCase
let config: BenchmarkConfig

describe('runBenchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    testCase = {
      samples: [{ code: 'const a = 1;', filename: 'a.js' }],
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
  })

  it('creates Bench with proper options and adds every test case', async () => {
    await runBenchmark({ testCases: [testCase], config })

    expect(createBench).toHaveBeenCalledWith({
      warmupIterations: config.warmup.iterations,
      iterations: config.iterations,
      warmup: config.warmup.enabled,
      timeoutMs: config.timeout,
    })

    let benchInstance = vi.mocked(createBench).mock.results[0]!.value as Bench
    expect(benchInstance.add).toHaveBeenCalledTimes(1)
    expect(benchInstance.add).toHaveBeenCalledWith(
      testCase.name,
      expect.any(Function),
    )
  })

  it('returns first tinybench Task', async () => {
    let task = await runBenchmark({ testCases: [testCase], config })
    expect(task).toEqual({ name: testCase.name })
  })

  it('calls ESLint once per sample', async () => {
    let eslint = await createESLintInstance({} as CreateESLintInstanceOptions)
    let lintSpy = eslint.lintText

    await runBenchmark({ testCases: [testCase], config })
    expect(lintSpy).toHaveBeenCalledTimes(testCase.samples.length + 1)
  })

  it('propagates error from createESLintInstance', async () => {
    let error = new Error('boom')
    vi.mocked(createESLintInstance).mockRejectedValueOnce(error)

    await expect(runBenchmark({ testCases: [testCase], config })).rejects.toBe(
      error,
    )
  })
})
