import type {
  TestRunResult,
  CodeSample,
  RuleConfig,
  TestCase,
} from '../types/test-case'
import type { BenchmarkConfig } from '../types/benchmark-config'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_REPORTER_FORMAT,
  DEFAULT_WARMUP_ENABLED,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
} from '../constants'
import { createTestCase } from '../core/test-case/create-test-case'
import { runBenchmark } from '../core/benchmark/run-benchmark'

/** Result of running a single rule benchmark. */
export interface SingleRuleResult {
  /** Summary statistics for the benchmark run. */
  summary: {
    /** Total number of ESLint warnings reported by the rule. */
    totalWarnings: number

    /** Median execution time in milliseconds. */
    medianTimeMs: number

    /** Total number of code samples tested. */
    totalSamples: number

    /** Total number of ESLint errors reported by the rule. */
    totalErrors: number

    /** Mean (average) execution time in milliseconds. */
    meanTimeMs: number

    /** Minimum execution time in milliseconds. */
    minTimeMs: number

    /** Maximum execution time in milliseconds. */
    maxTimeMs: number
  }

  /** Information about the tested rule. */
  rule: {
    /** File path to the rule module (if applicable). */
    path?: string

    /** Rule identifier, usually in format "namespace/rule-name". */
    id: string
  }

  /** Raw benchmark run results for detailed analysis. */
  benchmarkResults: TestRunResult[]
}

/** Parameters for running a single rule benchmark. */
interface RunSingleRuleParameters {
  /** Optional callback to be called after the test run completes. */
  onComplete?(result: SingleRuleResult): void

  /** Optional callback to be called before the test run starts. */
  onStart?(testCase: TestCase): void

  /** Benchmark configuration. */
  benchmarkConfig?: BenchmarkConfig

  /** Code samples to test the rule against. */
  codeSamples: CodeSample[]

  /** Path to custom parser (if applicable). */
  parserPath?: string

  /** Rule reference or config to benchmark. */
  rule: RuleConfig
}

/**
 * Calculates summary statistics from test run results.
 *
 * @param {TestRunResult[]} results - Array of test run results.
 * @returns {SingleRuleResult['summary']} Summary statistics.
 */
let calculateSummary = (
  results: TestRunResult[],
): SingleRuleResult['summary'] => {
  let allMeasurements = results.flatMap(result => result.measurements)
  let executionTimes = allMeasurements
    .map(measurement => measurement.executionTimeMs)
    .filter((time): time is number => typeof time === 'number')

  let totalWarnings = 0
  let totalErrors = 0

  for (let result of results) {
    if (result.eslintResults) {
      totalWarnings += result.eslintResults.warningCount
      totalErrors += result.eslintResults.errorCount
    }
  }

  let meanTimeMs =
    executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length

  let sortedTimes = [...executionTimes].toSorted((a, b) => a - b)
  let medianTimeMs = sortedTimes[Math.floor(sortedTimes.length / 2)]!

  return {
    minTimeMs: Math.min(...executionTimes),
    maxTimeMs: Math.max(...executionTimes),
    totalSamples: allMeasurements.length,
    totalWarnings,
    medianTimeMs,
    totalErrors,
    meanTimeMs,
  }
}

/**
 * Runs performance benchmark for a single ESLint rule.
 *
 * @param {RunSingleRuleParameters} parameters - Parameters for running the
 *   single rule benchmark.
 * @returns {Promise<SingleRuleResult>} A promise that resolves to the benchmark
 *   result.
 */
export let runSingleRule = async (
  parameters: RunSingleRuleParameters,
): Promise<SingleRuleResult> => {
  let { benchmarkConfig, codeSamples, onComplete, onStart, rule } = parameters

  let config = benchmarkConfig ?? {
    warmup: {
      iterations: DEFAULT_WARMUP_ITERATIONS,
      enabled: DEFAULT_WARMUP_ENABLED,
    },
    reporters: [{ format: DEFAULT_REPORTER_FORMAT }],
    iterations: DEFAULT_ITERATIONS,
    name: 'Single Rule Benchmark',
    timeout: DEFAULT_TIMEOUT_MS,
  }

  let ruleName: string

  if ('ruleId' in rule) {
    ruleName = rule.ruleId
  } else {
    ruleName = 'unknown-rule'
  }

  let ruleConfig: RuleConfig =
    'path' in rule
      ? {
          severity: rule.severity,
          options: rule.options,
          ruleId: rule.ruleId,
          path: rule.path,
        }
      : rule

  let testCase = createTestCase({
    id: `single-rule-${ruleName}-${Date.now()}`,
    name: `Rule: ${ruleName}`,
    samples: codeSamples,
    rule: ruleConfig,
  })

  let results = await runBenchmark({
    onTestComplete: result => {
      if (onComplete) {
        let summary = calculateSummary([result])
        let singleRuleResult: SingleRuleResult = {
          rule: {
            id: testCase.rule.ruleId,
          },
          benchmarkResults: [result],
          summary,
        }
        onComplete(singleRuleResult)
      }
    },
    testCases: [testCase],
    onTestStart: onStart,
    config,
  })

  let summary = calculateSummary(results)

  return {
    rule: {
      path: 'path' in rule ? rule.path : undefined,
      id: testCase.rule.ruleId,
    },
    benchmarkResults: results,
    summary,
  }
}
