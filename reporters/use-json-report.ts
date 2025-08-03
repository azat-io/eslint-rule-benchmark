import type {
  BenchmarkConfig,
  TestSpecResult,
  TestCaseResult,
} from '../types/benchmark-config'
import type { ProcessedBenchmarkTask } from '../core/benchmark/run-benchmark'
import type { UserBenchmarkConfig } from '../types/user-benchmark-config'
import type { BenchmarkMetrics } from '../types/benchmark-metrics'
import type { SystemInfo } from './collect-system-info'

import { collectSystemInfo } from './collect-system-info'
import { formatDeviation } from './format-deviation'
import { formatMs } from './format-ms'

/**
 * Top-level JSON report structure containing benchmark results and system
 * information.
 */
export interface JsonBenchmarkReport {
  /** Array of test specification results in JSON format. */
  testSpecifications: TestSpecJsonReport[]

  /** Information about the system where benchmarks were executed. */
  systemInfo: SystemInfo
}

/** Performance metrics for a single code sample in JSON-serializable format. */
interface JsonSampleMetrics {
  /** Standard deviation of execution times in formatted string. */
  standardDeviation: string | null

  /** Number of operations executed per second. */
  operationsPerSecond: number

  /** Average execution time in formatted string. */
  averageTime: string | null

  /** Minimum execution time in formatted string. */
  minimumTime: string | null

  /** Maximum execution time in formatted string. */
  maximumTime: string | null

  /** Median execution time in formatted string. */
  medianTime: string | null

  /** Duration of the benchmark period in seconds. */
  periodInSeconds: number

  /** Total number of samples collected during benchmarking. */
  totalSamples: number

  /** 75th percentile execution time in formatted string. */
  p75: string | null

  /** 99th percentile execution time in formatted string. */
  p99: string | null
}

/** JSON representation of benchmark results for a single test specification. */
interface TestSpecJsonReport {
  /**
   * Benchmark configuration settings (excluding baselinePath, reporters, and
   * name).
   */
  benchmarkConfig: Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'>

  /** Array of test case results within this specification. */
  testCases: JsonTestCaseReport[]

  /** Optional file path to the ESLint rule being tested. */
  rulePath?: string

  /** Identifier of the ESLint rule being tested. */
  ruleId: string

  /** Human-readable name of the test specification. */
  name: string
}

/** JSON representation of benchmark results for a single test case. */
interface JsonTestCaseReport {
  /** Array of sample benchmark results for this test case. */
  samples: JsonSampleResult[]

  /** Configuration options passed to the ESLint rule. */
  ruleOptions?: unknown

  /** Optional description of the test case. */
  description?: string

  /** Identifier of the ESLint rule being tested. */
  ruleId: string

  /** Human-readable name of the test case. */
  name: string

  /** Unique identifier of the test case. */
  id: string
}

/** JSON representation of benchmark results for a single code sample. */
interface JsonSampleResult {
  /** Performance metrics for this sample (null if benchmark failed). */
  metrics?: JsonSampleMetrics

  /** Name identifier of the code sample. */
  sampleName: string

  /** Error message if the benchmark failed for this sample. */
  error?: string
}

/**
 * Creates a JSON report string from aggregated benchmark results.
 *
 * @param results - An array of results for all test specifications.
 * @param _userConfig - The user's benchmark configuration (currently unused).
 * @returns Formatted JSON report as a string.
 */
export async function useJsonReport(
  results: TestSpecResult[],
  _userConfig: UserBenchmarkConfig,
): Promise<string> {
  let systemInfo = await collectSystemInfo()
  let testSpecifications = results.map(mapTestSpecResultToJsonReport)

  let report: JsonBenchmarkReport = {
    testSpecifications,
    systemInfo,
  }

  return JSON.stringify(report, null, 2)
}

/**
 * Creates a JSON-compatible object for a single Test Specification result.
 *
 * @param testSpecResult - The result for a test specification.
 * @returns A structured JSON-compatible object.
 */
function mapTestSpecResultToJsonReport(
  testSpecResult: TestSpecResult,
): TestSpecJsonReport {
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
 * Maps a ProcessedBenchmarkTask to JsonSampleMetrics.
 *
 * @param metrics - The benchmark metrics.
 * @returns JsonSampleMetrics object.
 */
function mapMetricsToJson(metrics: BenchmarkMetrics): JsonSampleMetrics {
  return {
    standardDeviation: formatDeviation(metrics.stdDev),
    operationsPerSecond: Math.round(metrics.hz),
    medianTime: formatMs(metrics.median),
    averageTime: formatMs(metrics.mean),
    minimumTime: formatMs(metrics.min),
    maximumTime: formatMs(metrics.max),
    totalSamples: metrics.sampleCount,
    periodInSeconds: metrics.period,
    p75: formatMs(metrics.p75),
    p99: formatMs(metrics.p99),
  }
}
