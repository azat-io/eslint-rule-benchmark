import { describe, expect, it, vi } from 'vitest'

import type {
  BenchmarkConfig,
  TestSpecResult,
  TestCaseResult,
} from '../../types/benchmark-config'
import type { ProcessedBenchmarkTask } from '../../core/benchmark/run-benchmark'
import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'
import type { BenchmarkMetrics } from '../../types/benchmark-metrics'
import type { RuleConfig } from '../../types/test-case'

import { useMarkdownReport } from '../../reporters/use-markdown-report'

vi.mock('../../reporters/collect-system-info', () => ({
  collectSystemInfo: () => ({
    cpuModel: 'Intel(R) Core(TM) i7-12700K CPU @ 3.60GHz',
    v8Version: '11.3.244.8-node.20',
    osRelease: '6.2.0-39-generic',
    nodeVersion: 'v20.11.0',
    eslintVersion: '9.27.0',
    platform: 'linux',
    cpuSpeedMHz: 3600,
    totalMemoryGb: 32,
    arch: 'x64',
    cpuCount: 8,
  }),
}))

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
  name: string,
  metricOverrides: Partial<BenchmarkMetrics> = {},
): ProcessedBenchmarkTask => ({
  metrics: createMockMetrics(metricOverrides),
  name,
})

let createMockRuleConfig = (
  ruleId: string = 'test-rule',
  path?: string,
  options?: unknown[],
): RuleConfig => ({
  options: options ?? undefined,
  severity: 2,
  ruleId,
  path,
})

interface CreateMockTestCaseResultParameters {
  samplesResults?: ProcessedBenchmarkTask[]
  ruleConfig?: RuleConfig
  description?: string
  name?: string
  id?: string
}

let createMockTestCaseResult = (
  parameters: CreateMockTestCaseResultParameters = {},
): TestCaseResult => {
  let name = parameters.name ?? 'Test Case 1'
  let id = parameters.id ?? 'tc-1'
  let ruleConfig = parameters.ruleConfig ?? createMockRuleConfig()
  let samplesResults = parameters.samplesResults ?? [
    createMockProcessedTask(`${name} on sampleA.js`),
  ]
  let { description } = parameters

  return {
    rule: ruleConfig,
    samplesResults,
    description,
    name,
    id,
  }
}

let createMockBenchmarkConfig = (
  overrides: Partial<
    Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'>
  > = {},
): Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'> => ({
  warmup: { enabled: true, iterations: 3 },
  iterations: 10,
  timeout: 5000,
  ...overrides,
})

interface CreateMockTestSpecResultParameters {
  benchmarkConfigOverrides?: Partial<
    Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'>
  >
  testCaseResults?: TestCaseResult[]
  rulePath?: string
  ruleId?: string
  name?: string
}

let createMockTestSpecResult = (
  parameters: CreateMockTestSpecResultParameters = {},
): TestSpecResult => {
  let {
    ruleId = 'test-spec-rule',
    benchmarkConfigOverrides,
    name = 'Test Spec 1',
    rulePath,
  } = parameters
  let testCaseResults = parameters.testCaseResults ?? [
    createMockTestCaseResult({}),
  ]
  let benchmarkConfig = createMockBenchmarkConfig(benchmarkConfigOverrides)

  return {
    benchmarkConfig,
    testCaseResults,
    rulePath,
    ruleId,
    name,
  }
}

let createMockUserConfig = (
  overrides: Partial<UserBenchmarkConfig> = {},
): UserBenchmarkConfig => ({
  tests: [],
  ...overrides,
})

describe('useMarkdownReport', () => {
  it('returns complete markdown report for valid benchmark results', async () => {
    let sample1 = createMockProcessedTask(
      'Test Spec 1 - Test Case 1 on sampleA.js',
      { median: 0.9, hz: 1000, mean: 1 },
    )
    let sample2 = createMockProcessedTask(
      'Test Spec 1 - Test Case 1 on sampleB.js',
      { median: 1.9, mean: 2, hz: 500 },
    )

    let ruleConfig = createMockRuleConfig('my-rule', 'path/to/my-rule.js')
    let testCase1 = createMockTestCaseResult({
      samplesResults: [sample1, sample2],
      description: 'Description for TC1',
      name: 'Test Spec 1 - Test Case 1',
      id: 'ts1-tc1',
      ruleConfig,
    })

    let testSpec1 = createMockTestSpecResult({
      benchmarkConfigOverrides: { iterations: 100, timeout: 3000 },
      rulePath: 'path/to/my-rule.js',
      testCaseResults: [testCase1],
      name: 'My Rule Benchmarks',
      ruleId: 'my-rule',
    })

    let mockTestSpecResults: TestSpecResult[] = [testSpec1]
    let mockUserCfg = createMockUserConfig()

    let markdownOutput = await useMarkdownReport(
      mockTestSpecResults,
      mockUserCfg,
    )

    expect(markdownOutput).toContain('# ESLint Rule Benchmark Report')
    expect(markdownOutput).toContain('## My Rule Benchmarks')
    expect(markdownOutput).toContain(
      '| Sample | Ops/sec | Avg Time | Median | Min | Max | StdDev | Samples |',
    )
    expect(markdownOutput).toContain(
      '| ------ | ------- | -------- | ------ | --- | --- | ------ | ------- |',
    )
    expect(markdownOutput).toContain(
      '| sampleA.js | 1,000 ops/sec | 1.000 ms | 0.900 ms | 0.800 ms | 1.200 ms | ±0.050 ms | 10 |',
    )
    expect(markdownOutput).toContain(
      '| sampleB.js | 500 ops/sec | 2.000 ms | 1.900 ms | 0.800 ms | 1.200 ms | ±0.050 ms | 10 |',
    )
    expect(markdownOutput).not.toContain('Test Specification:')
    expect(markdownOutput).not.toContain('Rule ID:')
    expect(markdownOutput).not.toContain('### Test Case:')
    expect(markdownOutput).not.toContain('### Sample:')
    expect(markdownOutput).not.toContain('Performance Summary')
    expect(markdownOutput).not.toContain('Benchmark Configuration')
  })

  it('handles multiple test specifications', async () => {
    let testSpec1 = createMockTestSpecResult({
      testCaseResults: [
        createMockTestCaseResult({
          samplesResults: [
            createMockProcessedTask('Base case on base-case.ts', {
              sampleCount: 37011,
              median: 0.055,
              stdDev: 0.002,
              mean: 0.056,
              min: 0.052,
              max: 0.063,
              hz: 17896,
            }),
          ],
          name: 'Base case',
        }),
        createMockTestCaseResult({
          samplesResults: [
            createMockProcessedTask('Complex case on complex-case.ts', {
              sampleCount: 32886,
              median: 0.055,
              stdDev: 0.002,
              mean: 0.056,
              min: 0.053,
              max: 0.062,
              hz: 17973,
            }),
          ],
          name: 'Complex case',
        }),
      ],
      rulePath: '../rules/no-negated-conjunction.ts',
      name: 'Rule: no-negated-conjunction',
      ruleId: 'no-negated-conjunction',
    })

    let testSpec2 = createMockTestSpecResult({
      testCaseResults: [
        createMockTestCaseResult({
          samplesResults: [
            createMockProcessedTask('Base case on base-case.ts', {
              sampleCount: 34813,
              median: 0.055,
              stdDev: 0.002,
              mean: 0.056,
              min: 0.053,
              max: 0.063,
              hz: 17941,
            }),
          ],
          name: 'Base case',
        }),
      ],
      rulePath: '../rules/no-negated-disjunction.ts',
      name: 'Rule: no-negated-disjunction',
      ruleId: 'no-negated-disjunction',
    })

    let mockTestSpecResults: TestSpecResult[] = [testSpec1, testSpec2]
    let mockUserCfg = createMockUserConfig()

    let markdownOutput = await useMarkdownReport(
      mockTestSpecResults,
      mockUserCfg,
    )

    expect(markdownOutput).toMatchSnapshot()
  })

  it('handles test specification with no test cases', async () => {
    let testSpec = createMockTestSpecResult({
      name: 'Empty Test Specification',
      testCaseResults: [],
    })

    let mockTestSpecResults: TestSpecResult[] = [testSpec]
    let mockUserCfg = createMockUserConfig()

    let markdownOutput = await useMarkdownReport(
      mockTestSpecResults,
      mockUserCfg,
    )

    expect(markdownOutput).toContain('## Empty Test Specification')
    expect(markdownOutput).toContain(
      'No test cases found or all failed for this specification.',
    )
  })

  it('handles test case with no samples', async () => {
    let testCase = createMockTestCaseResult({
      name: 'Test Case with No Samples',
      samplesResults: [],
    })

    let testSpec = createMockTestSpecResult({
      name: 'Test Spec with Empty Test Case',
      testCaseResults: [testCase],
    })

    let mockTestSpecResults: TestSpecResult[] = [testSpec]
    let mockUserCfg = createMockUserConfig()

    let markdownOutput = await useMarkdownReport(
      mockTestSpecResults,
      mockUserCfg,
    )

    expect(markdownOutput).toContain(
      '| No samples | N/A | N/A | N/A | N/A | N/A | N/A | N/A |',
    )
  })

  it('handles empty results array', async () => {
    let mockTestSpecResults: TestSpecResult[] = []
    let mockUserCfg = createMockUserConfig()

    let markdownOutput = await useMarkdownReport(
      mockTestSpecResults,
      mockUserCfg,
    )

    expect(markdownOutput).toBe('No benchmark results available.')
  })

  it('formats metrics with N/A for invalid numbers', async () => {
    let sample = createMockProcessedTask('Invalid metrics sample', {
      stdDev: undefined,
      median: Infinity,
      mean: undefined,
      min: -Infinity,
      sampleCount: 0,
      hz: Number.NaN,
      max: undefined,
    })

    let testCase = createMockTestCaseResult({
      name: 'Test Case with Invalid Metrics',
      samplesResults: [sample],
    })

    let testSpec = createMockTestSpecResult({
      name: 'Test Spec with Invalid Metrics',
      testCaseResults: [testCase],
    })

    let mockTestSpecResults: TestSpecResult[] = [testSpec]
    let mockUserCfg = createMockUserConfig()

    let markdownOutput = await useMarkdownReport(
      mockTestSpecResults,
      mockUserCfg,
    )

    expect(markdownOutput).toContain(
      '| Invalid metrics sample | N/A | N/A | N/A | N/A | N/A | N/A | 0 |',
    )
  })
})
