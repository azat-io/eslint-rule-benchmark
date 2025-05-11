import type { Task } from 'tinybench'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CodeSample, RuleConfig, TestCase } from '../../types/test-case'
import type { BenchmarkConfig } from '../../types/benchmark-config'

import { createTestCase } from '../../core/test-case/create-test-case'
import { runBenchmark } from '../../core/benchmark/run-benchmark'
import { runSingleRule } from '../../runners/run-single-rule'

vi.mock('../../core/test-case/create-test-case', () => ({
  createTestCase: vi.fn(),
}))
vi.mock('../../core/benchmark/run-benchmark', () => ({
  runBenchmark: vi.fn(),
}))

let mockTask = { name: 'stub-task' } as unknown as Task

describe('runSingleRule', () => {
  let samples: CodeSample[]
  let rule: RuleConfig
  let testCase: TestCase
  let cfg: BenchmarkConfig

  beforeEach(() => {
    vi.clearAllMocks()

    samples = [
      { code: 'const a = 1', filename: 'a.js' },
      { code: 'const b = 2', filename: 'b.js' },
    ]

    rule = { ruleId: 'test/rule', severity: 2 }

    testCase = {
      id: 'single-rule-test-rule-123',
      name: 'Rule: test/rule',
      iterationCount: 10,
      samples,
      rule,
    }

    cfg = {
      warmup: { enabled: true, iterations: 3 },
      reporters: [{ format: 'console' }],
      name: 'Benchmark',
      iterations: 20,
      timeout: 500,
    }

    vi.spyOn(Date, 'now').mockReturnValue(123)

    vi.mocked(createTestCase).mockReturnValue(testCase)
    vi.mocked(runBenchmark).mockResolvedValue(mockTask)
  })

  it('creates TestCase with correct arguments', async () => {
    await runSingleRule({ codeSamples: samples, benchmarkConfig: cfg, rule })

    expect(createTestCase).toHaveBeenCalledWith({
      id: 'single-rule-test/rule-123',
      name: 'Rule: test/rule',
      samples,
      rule,
    })
  })

  it('runs runBenchmark with correct parameters', async () => {
    await runSingleRule({ codeSamples: samples, benchmarkConfig: cfg, rule })

    expect(runBenchmark).toHaveBeenCalledWith({
      testCases: [testCase],
      config: cfg,
    })
  })

  it('returns SingleRuleResult with rule data and Task', async () => {
    let result = await runSingleRule({ codeSamples: samples, rule })

    expect(result).toEqual(
      expect.objectContaining({
        rule: { id: 'test/rule', path: undefined },
        result: mockTask,
      }),
    )
  })

  it('extracts path from RuleReference', async () => {
    let reference: RuleConfig = {
      path: '/abs/path/to/rule.js',
      ruleId: 'ref/rule',
      severity: 1,
    }

    await runSingleRule({ codeSamples: samples, rule: reference })

    expect(createTestCase).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rule: ref/rule',
        rule: reference,
      }),
    )
  })

  it('uses "unknown-rule" if ruleId is missing', async () => {
    let weirdRule = { severity: 2 } as unknown as RuleConfig

    await runSingleRule({ codeSamples: samples, rule: weirdRule })

    expect(createTestCase).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('single-rule-unknown-rule-') as string,
        name: 'Rule: unknown-rule',
      }),
    )
  })
})
