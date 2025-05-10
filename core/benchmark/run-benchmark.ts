import type { TestRunResult, TestCase } from '../../types/test-case'
import type { BenchmarkConfig } from '../../types/benchmark-config'

import { createESLintInstance } from '../eslint/create-eslint-instance'
import { createBench } from './create-bench'

/** Parameters for running a benchmark. */
interface RunBenchmarkParameters {
  /** Optional callback to be called after each test case completes. */
  onTestComplete?(result: TestRunResult): void

  /** Optional callback to be called before each test case starts. */
  onTestStart?(testCase: TestCase): void

  /** Configuration for the benchmark. */
  config: BenchmarkConfig

  /** Test cases to benchmark. */
  testCases: TestCase[]
}

/**
 * Runs a benchmark with the given configuration and test cases.
 *
 * @param {RunBenchmarkParameters} parameters - Parameters for running the
 *   benchmark.
 * @returns {Promise<TestRunResult[]>} A promise that resolves to an array of
 *   test results.
 */
export let runBenchmark = async (
  parameters: RunBenchmarkParameters,
): Promise<TestRunResult[]> => {
  let { onTestComplete, onTestStart, testCases, config } = parameters
  let results: TestRunResult[] = []

  let bench = createBench({
    warmupIterations: config.warmup.iterations,
    iterations: config.iterations,
    warmup: config.warmup.enabled,
    timeoutMs: config.timeout,
  })

  for (let testCase of testCases) {
    if (onTestStart) {
      onTestStart(testCase)
    }

    let task = createBenchmarkTask(testCase, result => {
      results.push(result)
      if (onTestComplete) {
        onTestComplete(result)
      }
    })

    bench.add(testCase.name, task)
  }

  await bench.run()

  return results
}

/**
 * Creates a benchmark task for a test case.
 *
 * @param {TestCase} testCase - The test case to create a task for.
 * @param {(result: TestRunResult) => void} onComplete - Callback for task
 *   completion.
 * @returns {() => Promise<void>} A benchmark task function.
 */
let createBenchmarkTask = (
  testCase: TestCase,
  onComplete: (result: TestRunResult) => void,
): (() => Promise<void>) => {
  let result: TestRunResult = {
    testCaseId: testCase.id,
    measurements: [],
    totalTimeMs: 0,
    aborted: false,
    startTime: 0,
    endTime: 0,
  }

  return async () => {
    result.startTime = Date.now()

    try {
      let { samples, rule } = testCase
      let eslint = await createESLintInstance({
        rule,
      })

      let eslintResults = {
        fixableWarningCount: 0,
        fixableErrorCount: 0,
        warningCount: 0,
        errorCount: 0,
      }

      let samplePromises = samples.map(async sample => {
        let sampleStartTime = performance.now()

        let lintResults = await eslint.lintText(sample.code, {
          filePath: sample.filename,
        })

        let executionTimeMs = performance.now() - sampleStartTime

        return {
          measurement: {
            timestamp: Date.now(),
            executionTimeMs,
          },
          lintResults,
        }
      })

      let sampleResults = await Promise.all(samplePromises)

      for (let sampleResult of sampleResults) {
        result.measurements.push(sampleResult.measurement)

        for (let lintResult of sampleResult.lintResults) {
          eslintResults.warningCount += lintResult.warningCount || 0
          eslintResults.errorCount += lintResult.errorCount || 0
          eslintResults.fixableWarningCount +=
            lintResult.fixableWarningCount || 0
          eslintResults.fixableErrorCount += lintResult.fixableErrorCount || 0
        }
      }

      result.eslintResults = eslintResults

      result.endTime = Date.now()
      result.totalTimeMs = result.endTime - result.startTime

      onComplete(result)
    } catch (error) {
      result.aborted = true
      result.endTime = Date.now()
      result.totalTimeMs = result.endTime - result.startTime
      result.errors = [(error as Error).message]

      onComplete(result)
    }
  }
}
