import { describe, expect, it, vi } from 'vitest'

import type {
  BenchmarkConfig,
  TestSpecResult,
  TestCaseResult,
} from '../../types/benchmark-config'
import type { ProcessedBenchmarkTask } from '../../core/benchmark/run-benchmark'
import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'
import type { JsonBenchmarkReport } from '../../reporters/use-json-report'
import type { BenchmarkMetrics } from '../../types/benchmark-metrics'
import type { RuleConfig } from '../../types/test-case'

import { useJsonReport } from '../../reporters/use-json-report'

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

interface CreateMockTestSpecResultParameters {
  benchmarkConfigOverrides?: Partial<
    Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'>
  >
  testCaseResults?: TestCaseResult[]
  rulePath?: string
  ruleId?: string
  name?: string
}

interface CreateMockTestCaseResultParameters {
  samplesResults?: ProcessedBenchmarkTask[]
  ruleConfig?: RuleConfig
  description?: string
  name?: string
  id?: string
}

function createMockTestSpecResult(
  parameters: CreateMockTestSpecResultParameters = {},
): TestSpecResult {
  let name = parameters.name ?? 'Test Spec 1'
  let ruleId = parameters.ruleId ?? 'test-spec-rule'
  let { benchmarkConfigOverrides, rulePath } = parameters
  let testCaseResults = parameters.testCaseResults ?? [
    createMockTestCaseResult({}),
  ]
  let benchmarkConfig = createMockSpecBenchmarkConfig(benchmarkConfigOverrides)

  return {
    benchmarkConfig,
    testCaseResults,
    rulePath,
    ruleId,
    name,
  }
}

function createMockTestCaseResult(
  parameters: CreateMockTestCaseResultParameters = {},
): TestCaseResult {
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

function createMockSpecBenchmarkConfig(
  overrides: Partial<
    Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'>
  > = {},
): Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'> {
  return {
    warmup: { enabled: true, iterations: 3 },
    iterations: 10,
    timeout: 5000,
    ...overrides,
  }
}

function createMockMetrics(
  overrides: Partial<BenchmarkMetrics> = {},
): BenchmarkMetrics {
  return {
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
  }
}

function createMockRuleConfig(
  ruleId: string = 'test-rule',
  path?: string,
  options?: unknown[],
): RuleConfig {
  return {
    options: options ?? undefined,
    severity: 2,
    ruleId,
    path,
  }
}

function createMockProcessedTask(
  name: string,
  metricOverrides: Partial<BenchmarkMetrics> = {},
): ProcessedBenchmarkTask {
  return {
    metrics: createMockMetrics(metricOverrides),
    name,
  }
}

function createMockUserConfig(
  overrides: Partial<UserBenchmarkConfig> = {},
): UserBenchmarkConfig {
  return {
    tests: [],
    ...overrides,
  }
}

describe('useJsonReport', () => {
  it('returns valid JSON string for complete benchmark results', async () => {
    let sample1Metrics = {
      sampleCount: 10,
      period: 0.001,
      stdDev: 0.05,
      median: 0.9,
      p75: 1.05,
      hz: 1000,
      min: 0.8,
      max: 1.2,
      p99: 1.1,
      mean: 1,
    }
    let sample1 = createMockProcessedTask(
      'My Rule Benchmarks - TC1 on sampleA.js',
      sample1Metrics,
    )
    let sample2Metrics = {
      sampleCount: 10,
      period: 0.002,
      median: 1.9,
      stdDev: 0.1,
      min: 1.5,
      max: 2.5,
      p75: 2.1,
      p99: 2.4,
      mean: 2,
      hz: 500,
    }
    let sample2 = createMockProcessedTask(
      'My Rule Benchmarks - TC1 on sampleB.js',
      sample2Metrics,
    )

    let ruleConfig = createMockRuleConfig('my-rule', 'path/to/my-rule.js', [
      { option1: true },
    ])
    let testCase1 = createMockTestCaseResult({
      samplesResults: [sample1, sample2],
      description: 'Description for TC1',
      name: 'My Rule Benchmarks - TC1',
      id: 'ts1-tc1',
      ruleConfig,
    })

    let specBenchConfigInput = { iterations: 100, timeout: 3000 }
    let testSpec1 = createMockTestSpecResult({
      benchmarkConfigOverrides: specBenchConfigInput,
      rulePath: 'path/to/my-rule.js',
      testCaseResults: [testCase1],
      name: 'My Rule Benchmarks',
      ruleId: 'my-rule',
    })

    let mockTestSpecResults: TestSpecResult[] = [testSpec1]
    let mockUserCfg = createMockUserConfig()

    let jsonOutput = await useJsonReport(mockTestSpecResults, mockUserCfg)
    let parsedReport = JSON.parse(jsonOutput) as JsonBenchmarkReport

    expect(parsedReport.testSpecifications).toBeDefined()
    expect(parsedReport.systemInfo).toBeDefined()
    expect(Array.isArray(parsedReport.testSpecifications)).toBeTruthy()
    expect(parsedReport.testSpecifications).toHaveLength(1)

    expect(parsedReport.systemInfo.nodeVersion).toBe('v20.11.0')
    expect(parsedReport.systemInfo.platform).toBe('linux')
    expect(parsedReport.systemInfo.eslintVersion).toBe('9.27.0')

    let parsed = parsedReport.testSpecifications[0]!

    expect(parsed.name).toBe('My Rule Benchmarks')
    expect(parsed.ruleId).toBe('my-rule')
    expect(parsed.rulePath).toBe('path/to/my-rule.js')
    expect(parsed.benchmarkConfig).toEqual({
      warmup: { enabled: true, iterations: 3 },
      iterations: 100,
      timeout: 3000,
    })
    expect(parsed.testCases).toHaveLength(1)

    let tcParsed = parsed.testCases[0]!
    expect(tcParsed.name).toBe('My Rule Benchmarks - TC1')
    expect(tcParsed.id).toBe('ts1-tc1')
    expect(tcParsed.description).toBe('Description for TC1')
    expect(tcParsed.ruleId).toBe('my-rule')
    expect(tcParsed.ruleOptions).toEqual([{ option1: true }])
    expect(tcParsed.samples).toHaveLength(2)

    let sampleAParsed = tcParsed.samples[0]!
    expect(sampleAParsed.sampleName).toBe('sampleA.js')
    expect(sampleAParsed.metrics).toBeDefined()
    expect(sampleAParsed.metrics?.operationsPerSecond).toBe(1000)
    expect(sampleAParsed.metrics?.averageTime).toBe('1.000 ms')
    expect(sampleAParsed.metrics?.medianTime).toBe('0.900 ms')
    expect(sampleAParsed.metrics?.periodInSeconds).toBe(0.001)

    let sampleBParsed = tcParsed.samples[1]!
    expect(sampleBParsed.sampleName).toBe('sampleB.js')
    expect(sampleBParsed.metrics).toBeDefined()
    expect(sampleBParsed.metrics?.operationsPerSecond).toBe(500)
    expect(sampleBParsed.metrics?.averageTime).toBe('2.000 ms')
    expect(sampleBParsed.metrics?.medianTime).toBe('1.900 ms')
    expect(sampleBParsed.metrics?.periodInSeconds).toBe(0.002)
  })
})
