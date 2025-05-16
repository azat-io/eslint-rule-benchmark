import type { Task } from 'tinybench'
import type { ESLint } from 'eslint'

import type { BenchmarkConfig } from '../../types/benchmark-config'
import type { TestCase } from '../../types/test-case'
import type { LANGUAGES } from '../../constants'

import { createESLintInstance } from '../eslint/create-eslint-instance'
import { createBench } from './create-bench'

/** Parameters for running a benchmark. */
interface RunBenchmarkParameters {
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
 * @returns {Promise<Task | null>} A promise that resolves to an array of test
 *   results.
 */
export let runBenchmark = async (
  parameters: RunBenchmarkParameters,
): Promise<Task | null> => {
  let { testCases, config } = parameters

  let bench = createBench({
    warmupIterations: config.warmup.iterations,
    iterations: config.iterations,
    warmup: config.warmup.enabled,
    timeoutMs: config.timeout,
  })

  let { rule } = testCases[0]!
  let languages: (typeof LANGUAGES)[number][] = []

  for (let testCase of testCases) {
    for (let sample of testCase.samples) {
      if (!languages.includes(sample.language)) {
        languages.push(sample.language)
      }
    }
  }

  let eslint = await createESLintInstance({
    languages,
    rule,
  })
  await eslint.lintText('/* eslint-disable */')

  for (let testCase of testCases) {
    let task = createBenchmarkTask(eslint, testCase)

    bench.add(testCase.name, task)
  }

  let [benchResult] = await bench.run()

  return benchResult!
}

/**
 * Creates a benchmark task for a test case.
 *
 * @param {ESLint} eslint - The ESLint instance to use for linting.
 * @param {TestCase} testCase - The test case to create a task for.
 * @returns {() => Promise<void>} A benchmark task function.
 */
let createBenchmarkTask =
  (eslint: ESLint, testCase: TestCase): (() => Promise<void>) =>
  async () => {
    let { samples } = testCase

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

    await Promise.all(samplePromises)
  }
