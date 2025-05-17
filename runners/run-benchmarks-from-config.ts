import type { Task } from 'tinybench'

import fs from 'node:fs/promises'
import path from 'node:path'

import type {
  SingleRuleResult,
  ReporterOptions,
  BenchmarkConfig,
} from '../types/benchmark-config'
import type { CodeSample, RuleConfig, TestCase } from '../types/test-case'
import type { UserBenchmarkConfig } from '../types/user-benchmark-config'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_WARMUP_ENABLED,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_SEVERITY,
} from '../constants'
import { getLanguageByFileName } from '../core/utilities/get-language-by-file-name'
import { isSupportedExtension } from '../core/utilities/is-supported-extension'
import { getFileExtension } from '../core/utilities/get-file-extension'
import { createTestCase } from '../core/test-case/create-test-case'
import { runBenchmark } from '../core/benchmark/run-benchmark'
import { runReporters } from '../reporters'

/** Parameters for running benchmarks based on a user configuration. */
interface RunBenchmarksFromConfigParameters {
  /** Options for the reporters. */
  reporterOptions: ReporterOptions[]

  /** The user-defined benchmark configuration. */
  userConfig: UserBenchmarkConfig
}

/**
 * Asynchronously loads code samples from a specified path or an array of paths.
 *
 * This function processes each given path. If a path points to a directory, it
 * reads files with supported extensions within that directory. If a path points
 * to a file with a supported extension, it reads that file. The content of each
 * valid file is read, and a CodeSample object is created, including its
 * content, filename, and determined language. Unsupported files or paths
 * leading to errors are skipped with a console warning.
 *
 * @example
 *   const samples = await loadCodeSamples('./src/my-rule/test-cases/')
 *   const specificSamples = await loadCodeSamples([
 *     './src/a.js',
 *     './src/b.ts',
 *   ])
 *
 * @param {string | string[]} testPath - A single path (string) or an array of
 *   paths to files or directories containing code samples.
 * @returns {Promise<CodeSample[]>} A promise that resolves to an array of
 *   CodeSample objects. Each object represents a successfully loaded code
 *   sample.
 * @throws {Error} If no supported source files are found across all provided
 *   paths, or if no valid code samples could be loaded from the found files.
 */
let loadCodeSamples = async (
  testPath: string[] | string,
): Promise<CodeSample[]> => {
  let pathsToProcess = Array.isArray(testPath) ? testPath : [testPath]

  let fileArrays = await Promise.all(
    pathsToProcess.map(async currentPath => {
      let filesForCurrentPath: string[] = []
      try {
        let resolvedPath = path.resolve(process.cwd(), currentPath)
        let stats = await fs.stat(resolvedPath)

        if (stats.isDirectory()) {
          let filesInDirectory = await fs.readdir(resolvedPath)
          for (let fileName of filesInDirectory.filter(item =>
            isSupportedExtension(getFileExtension(item)),
          )) {
            filesForCurrentPath.push(path.join(resolvedPath, fileName))
          }
        } else if (
          stats.isFile() &&
          isSupportedExtension(getFileExtension(resolvedPath))
        ) {
          filesForCurrentPath.push(resolvedPath)
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(
            `Warning: Could not process path ${currentPath}: ${error.message}. Skipping.`,
          )
        } else {
          console.warn(
            `Warning: Could not process path ${currentPath}: ${String(error)}. Skipping.`,
          )
        }
      }
      return filesForCurrentPath
    }),
  )

  let sourceFiles: string[] = fileArrays.flat()

  if (sourceFiles.length === 0) {
    throw new Error(
      `No supported source files found for testPath: ${JSON.stringify(testPath)}`,
    )
  }

  let codeSamples: CodeSample[] = []
  await Promise.all(
    sourceFiles.map(async file => {
      try {
        let code = await fs.readFile(file, 'utf8')
        codeSamples.push({
          language: getLanguageByFileName(file),
          filename: path.basename(file),
          code,
        })
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.warn(
            `Warning: Skipping file ${file} due to read error: ${error.message}`,
          )
        } else {
          console.warn(
            `Warning: Skipping file ${file} due to read error: ${String(error)}`,
          )
        }
      }
    }),
  )

  if (codeSamples.length === 0) {
    throw new Error(
      `No valid code samples could be loaded from testPath: ${JSON.stringify(testPath)}`,
    )
  }
  return codeSamples
}

/**
 * Orchestrates the entire benchmark process based on a user-provided
 * configuration.
 *
 * This function takes a UserBenchmarkConfig object and reporter options. It
 * performs the following steps:
 *
 * 1. Validates the top-level user configuration (e.g., iterations, timeout).
 * 2. For each test specification in `userConfig.tests`: a. Loads code samples
 *    using `loadCodeSamples`. b. Creates a `RuleConfig` and then a `TestCase`.
 *    c. Skips test specs that lead to errors or yield no code samples.
 * 3. If no valid `TestCase` objects can be generated, it logs an error and sets
 *    the process exit code.
 * 4. Calls `runBenchmark` with all valid `TestCase` objects and a global
 *    `BenchmarkConfig`.
 * 5. For each `Task` result returned by `runBenchmark` (representing a single
 *    sample's benchmark), it finds the corresponding `TestCase` to provide rule
 *    context.
 * 6. Calls `runReporters` to output/save the results for each task.
 *
 * Errors during individual test spec processing are logged, and the process
 * attempts to continue with other valid test specs.
 *
 * @example
 *   // Assuming userConfig and reporterOpts are defined:
 *   await runBenchmarksFromConfig({
 *     userConfig,
 *     reporterOptions: reporterOpts,
 *   })
 *
 * @param {RunBenchmarksFromConfigParameters} parameters - An object containing
 *   the `userConfig` (the UserBenchmarkConfig object) and `reporterOptions` (an
 *   array of reporter configurations).
 * @returns {Promise<void>} A promise that resolves when all benchmarks have
 *   been run and reported, or when the process exits due to critical errors
 *   (e.g., no valid test cases).
 */
export let runBenchmarksFromConfig = async (
  parameters: RunBenchmarksFromConfigParameters,
): Promise<void> => {
  let { reporterOptions, userConfig } = parameters

  if (userConfig.tests.length === 0) {
    console.warn('User configuration contains no tests. Exiting.')
    return
  }

  let globalBenchmarkConfig: BenchmarkConfig = {
    warmup: {
      iterations: userConfig.warmup?.iterations ?? DEFAULT_WARMUP_ITERATIONS,
      enabled: userConfig.warmup?.enabled ?? DEFAULT_WARMUP_ENABLED,
    },
    iterations: userConfig.iterations ?? DEFAULT_ITERATIONS,
    timeout: userConfig.timeout ?? DEFAULT_TIMEOUT_MS,
    name: 'User Config Benchmark Run',
    reporters: reporterOptions,
  }

  let processedTestCases = await Promise.all(
    userConfig.tests.map(async testSpec => {
      try {
        let codeSamples = await loadCodeSamples(testSpec.testPath)

        let ruleConfig: RuleConfig = {
          severity: testSpec.severity ?? DEFAULT_SEVERITY,
          options: testSpec.options,
          ruleId: testSpec.ruleId,
          path: testSpec.rulePath,
        }

        return createTestCase({
          id: `config-test-${testSpec.name.replaceAll(/\s+/gu, '-')}-${Date.now()}`,
          samples: codeSamples,
          name: testSpec.name,
          rule: ruleConfig,
        })
      } catch (error: unknown) {
        let errorValue = error as Error
        console.warn(
          `Skipping test "${testSpec.name}" due to an error: ${errorValue.message}`,
        )
        return null
      }
    }),
  )

  let testCases: TestCase[] = processedTestCases.filter(
    (tc): tc is TestCase => tc !== null,
  )

  if (testCases.length === 0) {
    console.error(
      'No valid test cases could be generated from the user configuration. Exiting.',
    )
    process.exitCode = 1
    return
  }

  console.info(
    `Starting benchmark run for ${testCases.length} test case(s) from configuration...`,
  )

  let benchmarkRunResults: Task[] | null = await runBenchmark({
    config: globalBenchmarkConfig,
    testCases,
  })

  if (benchmarkRunResults && benchmarkRunResults.length > 0) {
    for (let taskItem of benchmarkRunResults) {
      let correspondingTestCase: undefined | TestCase
      let taskName = taskItem.name || ''

      for (let tc of testCases) {
        if (taskName.startsWith(`${tc.name} on `)) {
          correspondingTestCase = tc
          break
        }
      }

      if (correspondingTestCase) {
        let reportableResult: SingleRuleResult = {
          rule: {
            id: correspondingTestCase.rule.ruleId,
            path: correspondingTestCase.rule.path,
          },
          result: taskItem,
        }
        runReporters(reportableResult, globalBenchmarkConfig)
      } else {
        if (testCases.length === 1) {
          correspondingTestCase = testCases[0]!
          let reportableResult: SingleRuleResult = {
            rule: {
              id: correspondingTestCase.rule.ruleId,
              path: correspondingTestCase.rule.path,
            },
            result: taskItem,
          }
          runReporters(reportableResult, globalBenchmarkConfig)
          console.warn(
            `Could not precisely match task "${taskName}" to a TestCase name. Attributed to the sole TestCase "${correspondingTestCase.name}".`,
          )
        } else {
          console.warn(
            `Could not find corresponding TestCase for benchmark task "${taskName}". Skipping report for this task.`,
          )
        }
      }
    }
  } else if (testCases.length > 0) {
    console.warn(
      'Benchmark run completed, but no results were returned to report.',
    )
  }

  console.info('Benchmark run finished.')
}
