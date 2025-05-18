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

  /** Path to the configuration directory. */
  configDirectory: string

  /** Test cases to benchmark. */
  testCases: TestCase[]
}

/** Language type for benchmarking */
type Language = (typeof LANGUAGES)[number]

/**
 * Runs benchmarks based on the provided test cases and configuration.
 *
 * This function orchestrates the benchmarking process using tinybench. It
 * creates a new ESLint instance for each unique TestCase (based on its rule
 * configuration) to ensure isolation. Each code sample within a TestCase is
 * then added as an individual task to a tinybench Bench instance. Finally, it
 * runs all collected tasks and returns their results.
 *
 * If no test cases are provided, or if no valid benchmark tasks can be
 * generated (e.g., due to errors in ESLint instance creation or lack of
 * runnable samples), it will return null.
 *
 * @example
 *   // Assuming testCases and config are defined:
 *   const results = await runBenchmark({ testCases, config })
 *   if (results) {
 *     results.forEach(taskResult => {
 *       console.log(`Task: ${taskResult.name}, Ops/sec: ${taskResult.hz}`)
 *     })
 *   }
 *
 * @param {RunBenchmarkParameters} parameters - The parameters for running the
 *   benchmark, including the overall benchmark configuration and an array of
 *   test cases.
 * @returns {Promise<Task[] | null>} A promise that resolves to an array of Task
 *   objects from tinybench, where each Task represents the result of
 *   benchmarking a single code sample. Returns null if no tasks were run.
 */
export let runBenchmark = async (
  parameters: RunBenchmarkParameters,
): Promise<Task[] | null> => {
  let { configDirectory, testCases, config } = parameters

  if (testCases.length === 0) {
    return null
  }

  let bench = createBench({
    warmupIterations: config.warmup.iterations,
    iterations: config.iterations,
    warmup: config.warmup.enabled,
    timeoutMs: config.timeout,
  })

  for (let testCase of testCases) {
    /* eslint-disable no-await-in-loop */
    let currentTestCaseLanguages: Language[] = []
    for (let sample of testCase.samples) {
      if (!currentTestCaseLanguages.includes(sample.language)) {
        currentTestCaseLanguages.push(sample.language)
      }
    }

    if (currentTestCaseLanguages.length === 0) {
      console.warn(
        `Skipping TestCase "${testCase.name}" as it has no samples with recognized languages.`,
      )
      continue
    }

    let eslint: ESLint
    try {
      eslint = await createESLintInstance({
        languages: currentTestCaseLanguages,
        rule: testCase.rule,
        configDirectory,
      })
      await eslint.lintText('/* eslint-disable */')
    } catch (error: unknown) {
      let errorValue = error as Error
      console.error(
        `Failed to create ESLint instance for TestCase "${testCase.name}": ${
          errorValue.message
        }. Skipping this test case.`,
      )
      continue
    }

    for (let sample of testCase.samples) {
      bench.add(`${testCase.name} on ${sample.filename}`, async () => {
        await eslint.lintText(sample.code, { filePath: sample.filename })
      })
    }
    /* eslint-enable no-await-in-loop */
  }

  if (bench.tasks.length === 0) {
    console.warn('No benchmark tasks were added. Nothing to run.')
    return null
  }

  return await bench.run()
}
