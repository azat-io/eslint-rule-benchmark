import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TestRunResult, CodeSample, TestCase } from '../../types/test-case'
import type { SingleRuleResult } from '../../runners/run-single-rule'
import type { BenchmarkConfig } from '../../types/benchmark-config'
import type { RuleConfig } from '../../types/test-case'

import { createTestCase } from '../../core/test-case/create-test-case'
import { runBenchmark } from '../../core/benchmark/run-benchmark'
import { runSingleRule } from '../../runners/run-single-rule'

vi.mock('../../core/benchmark/run-benchmark', () => ({
  runBenchmark: vi.fn(),
}))

vi.mock('../../core/test-case/create-test-case', () => ({
  createTestCase: vi.fn(),
}))

describe('runSingleRule', () => {
  let mockCodeSamples: CodeSample[]
  let mockRule: RuleConfig
  let mockConfig: BenchmarkConfig
  let mockTestCase: TestCase
  let mockTestRunResults: TestRunResult[]
  let mockOnStart: ReturnType<typeof vi.fn>
  let mockOnComplete: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCodeSamples = [
      {
        code: 'const x = 1;',
        filename: 'test.js',
      },
      {
        code: 'const y = 2;',
        filename: 'test2.js',
      },
    ]

    mockRule = {
      ruleId: 'test-rule',
      severity: 2,
    }

    mockTestCase = {
      id: 'single-rule-test-rule-1234567890',
      samples: mockCodeSamples,
      name: 'Rule: test-rule',
      iterationCount: 10,
      rule: mockRule,
    }

    mockConfig = {
      reporters: [
        {
          format: 'console',
        },
      ],
      warmup: { enabled: true, iterations: 2 },
      name: 'Test Benchmark',
      iterations: 10,
      timeout: 1000,
    }

    mockTestRunResults = [
      {
        eslintResults: {
          fixableWarningCount: 1,
          fixableErrorCount: 0,
          warningCount: 2,
          errorCount: 1,
        },
        measurements: [
          {
            executionTimeMs: 50,
            timestamp: 1050,
          },
        ],
        testCaseId: mockTestCase.id,
        totalTimeMs: 100,
        startTime: 1000,
        aborted: false,
        endTime: 1100,
      },
    ]

    mockOnStart = vi.fn()
    mockOnComplete = vi.fn()

    vi.mocked(createTestCase).mockReturnValue(mockTestCase)
    vi.mocked(runBenchmark).mockResolvedValue(mockTestRunResults)

    vi.spyOn(Date, 'now').mockReturnValue(1234567890)
  })

  it('should create a test case with the correct parameters', async () => {
    await runSingleRule({
      codeSamples: mockCodeSamples,
      benchmarkConfig: mockConfig,
      rule: mockRule,
    })

    expect(createTestCase).toHaveBeenCalledWith({
      id: 'single-rule-test-rule-1234567890',
      samples: mockCodeSamples,
      name: 'Rule: test-rule',
      rule: mockRule,
    })
  })

  it('should run the benchmark with the created test case', async () => {
    await runSingleRule({
      codeSamples: mockCodeSamples,
      benchmarkConfig: mockConfig,
      onComplete: mockOnComplete,
      onStart: mockOnStart,
      rule: mockRule,
    })

    expect(runBenchmark).toHaveBeenCalledWith({
      onTestComplete: expect.any(Function) as (result: TestRunResult) => void,
      testCases: [mockTestCase],
      onTestStart: mockOnStart,
      config: mockConfig,
    })
  })

  it('should use default benchmark config if none provided', async () => {
    await runSingleRule({
      codeSamples: mockCodeSamples,
      rule: mockRule,
    })

    expect(runBenchmark).toHaveBeenCalledWith({
      config: {
        warmup: { iterations: 10, enabled: true },
        reporters: [{ format: 'console' }],
        name: 'Single Rule Benchmark',
        iterations: 50,
        timeout: 300,
      },
      onTestComplete: expect.any(Function) as (result: TestRunResult) => void,
      testCases: [mockTestCase],
      onTestStart: undefined,
    })
  })

  it('should handle rule references correctly', async () => {
    let ruleReference: RuleConfig = {
      options: [{ option1: 'value1' }],
      path: '/path/to/rule.js',
      ruleId: 'ref-rule',
      severity: 1,
    }

    await runSingleRule({
      codeSamples: mockCodeSamples,
      rule: ruleReference,
    })

    expect(createTestCase).toHaveBeenCalledWith({
      rule: {
        options: [{ option1: 'value1' }],
        path: '/path/to/rule.js',
        ruleId: 'ref-rule',
        severity: 1,
      },
      id: expect.stringContaining('single-rule-ref-rule-') as string,
      samples: mockCodeSamples,
      name: 'Rule: ref-rule',
    })
  })

  it('should use default severity if not provided in rule reference', async () => {
    let ruleReference: RuleConfig = {
      path: '/path/to/rule.js',
      ruleId: 'ref-rule',
      severity: 2,
    }

    await runSingleRule({
      codeSamples: mockCodeSamples,
      rule: ruleReference,
    })

    expect(createTestCase).toHaveBeenCalledWith({
      rule: {
        path: '/path/to/rule.js',
        ruleId: 'ref-rule',
        options: undefined,
        severity: 2,
      },
      id: expect.stringContaining('single-rule-ref-rule-') as string,
      samples: mockCodeSamples,
      name: 'Rule: ref-rule',
    })
  })

  it('should call onComplete callback with correct result', async () => {
    let capturedResult: SingleRuleResult | undefined

    await runSingleRule({
      onComplete: result => {
        capturedResult = result
      },
      codeSamples: mockCodeSamples,
      rule: mockRule,
    })

    let firstCall = vi.mocked(runBenchmark).mock.calls[0]?.[0]
    let onTestCompleteCallback = firstCall?.onTestComplete

    onTestCompleteCallback?.(mockTestRunResults[0]!)

    expect(capturedResult).toBeDefined()
    expect(capturedResult?.rule.id).toBe(mockRule.ruleId)
    expect(capturedResult?.benchmarkResults).toHaveLength(1)
    expect(capturedResult?.benchmarkResults[0]).toBe(mockTestRunResults[0])
    expect(capturedResult?.summary).toMatchObject({
      totalWarnings: 2,
      totalSamples: 1,
      totalErrors: 1,
    })
  })

  it('should return aggregated results with correct summary statistics', async () => {
    let result = await runSingleRule({
      codeSamples: mockCodeSamples,
      rule: mockRule,
    })

    expect(result).toMatchObject({
      summary: {
        totalWarnings: 2,
        medianTimeMs: 50,
        totalSamples: 1,
        totalErrors: 1,
        meanTimeMs: 50,
        minTimeMs: 50,
        maxTimeMs: 50,
      },
      rule: {
        id: mockRule.ruleId,
      },
      benchmarkResults: mockTestRunResults,
    })
  })

  it('should handle non-standard rule objects and use "unknown-rule" as fallback', async () => {
    interface NonStandardRule {
      someProperty: string
      severity: number
    }

    let nonStandardRule: Partial<RuleConfig> & NonStandardRule = {
      someProperty: 'value',
      severity: 2,
    }

    await runSingleRule({
      rule: nonStandardRule as RuleConfig,
      codeSamples: mockCodeSamples,
    })

    expect(createTestCase).toHaveBeenCalledWith({
      id: expect.stringContaining('single-rule-unknown-rule-') as string,
      name: 'Rule: unknown-rule',
      samples: mockCodeSamples,
      rule: nonStandardRule,
    })
  })

  it('should correctly set path to undefined when using a regular RuleConfig', async () => {
    let result = await runSingleRule({
      codeSamples: mockCodeSamples,
      rule: mockRule,
    })

    expect(result.rule.path).toBeUndefined()
  })

  it('should correctly extract path from RuleReference', async () => {
    let ruleReference: RuleConfig = {
      path: '/path/to/rule.js',
      ruleId: 'ref-rule',
      severity: 1,
    }

    let result = await runSingleRule({
      codeSamples: mockCodeSamples,
      rule: ruleReference,
    })

    expect(result.rule.path).toBe('/path/to/rule.js')
  })

  it('should preserve original rule when not a RuleReference', async () => {
    let mockRuleCopy = { ...mockRule }

    vi.mocked(createTestCase).mockImplementationOnce(parameters => {
      expect(parameters.rule).toBe(mockRuleCopy)
      return mockTestCase
    })

    await runSingleRule({
      codeSamples: mockCodeSamples,
      rule: mockRuleCopy,
    })

    expect(createTestCase).toHaveBeenCalledWith({
      id: expect.stringContaining('single-rule-test-rule-') as string,
      name: expect.stringContaining('Rule: test-rule') as string,
      samples: mockCodeSamples,
      rule: mockRuleCopy,
    })
  })

  it('should handle empty objects through type checks', async () => {
    vi.mocked(createTestCase).mockImplementationOnce(parameters => {
      expect(parameters.name).toBe('Rule: unknown-rule')
      return mockTestCase
    })

    await runSingleRule({
      rule: {} as unknown as RuleConfig,
      codeSamples: mockCodeSamples,
    })

    expect(createTestCase).toHaveBeenCalledWith({
      id: expect.stringContaining('single-rule-unknown-rule-') as string,
      rule: expect.anything() as RuleConfig,
      name: 'Rule: unknown-rule',
      samples: mockCodeSamples,
    })
  })
})
