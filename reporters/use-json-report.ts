import type {
  BenchmarkConfig,
  TestSpecResult,
  TestCaseResult,
} from '../types/benchmark-config'
import type { ProcessedBenchmarkTask } from '../core/benchmark/run-benchmark'
import type { UserBenchmarkConfig } from '../types/user-benchmark-config'
import type { BenchmarkMetrics } from '../types/benchmark-metrics'

import { formatMs } from './format-ms'

export interface TestSpecJsonReport {
  benchmarkConfig: Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'>
  testCases: JsonTestCaseReport[]
  rulePath?: string
  ruleId: string
  name: string
}

interface JsonSampleMetrics {
  standardDeviation: string | null
  operationsPerSecond: number
  averageTime: string | null
  minimumTime: string | null
  maximumTime: string | null
  medianTime: string | null
  periodInSeconds: number
  totalSamples: number
  p75: string | null
  p99: string | null
}

interface JsonTestCaseReport {
  samples: JsonSampleResult[]
  ruleOptions?: unknown
  description?: string
  ruleId: string
  name: string
  id: string
}

interface JsonSampleResult {
  metrics?: JsonSampleMetrics
  sampleName: string
  error?: string
}

/**
 * Maps a ProcessedBenchmarkTask to JsonSampleMetrics.
 *
 * @param {BenchmarkMetrics} metrics - The benchmark metrics.
 * @returns {JsonSampleMetrics} JsonSampleMetrics object.
 */
let mapMetricsToJson = (metrics: BenchmarkMetrics): JsonSampleMetrics => ({
  standardDeviation: formatMs(metrics.stdDev),
  operationsPerSecond: Math.round(metrics.hz),
  medianTime: formatMs(metrics.median),
  averageTime: formatMs(metrics.mean),
  minimumTime: formatMs(metrics.min),
  maximumTime: formatMs(metrics.max),
  totalSamples: metrics.sampleCount,
  periodInSeconds: metrics.period,
  p75: formatMs(metrics.p75),
  p99: formatMs(metrics.p99),
})

/**
 * Creates a JSON-compatible object for a single Test Specification result.
 *
 * @param {TestSpecResult} testSpecResult - The result for a test specification.
 * @returns {TestSpecJsonReport} A structured JSON-compatible object.
 */
let mapTestSpecResultToJsonReport = (
  testSpecResult: TestSpecResult,
): TestSpecJsonReport => {
  let testCasesReport: JsonTestCaseReport[] =
    testSpecResult.testCaseResults.map(
      (testCase: TestCaseResult): JsonTestCaseReport => {
        let samplesReport: JsonSampleResult[] = testCase.samplesResults.map(
          (sample: ProcessedBenchmarkTask): JsonSampleResult => {
            let sampleName = sample.name.replace(`${testCase.name} on `, '')
            return {
              metrics: mapMetricsToJson(sample.metrics),
              sampleName,
            }
          },
        )

        return {
          ruleOptions: testCase.rule.options,
          description: testCase.description,
          ruleId: testCase.rule.ruleId,
          samples: samplesReport,
          name: testCase.name,
          id: testCase.id,
        }
      },
    )

  return {
    benchmarkConfig: testSpecResult.benchmarkConfig,
    rulePath: testSpecResult.rulePath,
    ruleId: testSpecResult.ruleId,
    testCases: testCasesReport,
    name: testSpecResult.name,
  }
}

/**
 * Creates a JSON report string from aggregated benchmark results.
 *
 * @param {TestSpecResult[]} results - An array of results for all test
 *   specifications.
 * @param {UserBenchmarkConfig} _userConfig - The user's benchmark configuration
 *   (currently unused).
 * @returns {string} Formatted JSON report as a string.
 */
export let useJsonReport = (
  results: TestSpecResult[],
  _userConfig: UserBenchmarkConfig,
): string => {
  let reportArray = results.map(mapTestSpecResultToJsonReport)
  return JSON.stringify(reportArray, null, 2)
}
