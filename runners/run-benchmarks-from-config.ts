import fs from 'node:fs/promises'
import path from 'node:path'

import type {
  ReporterOptions,
  BenchmarkConfig,
  TestSpecResult,
  TestCaseResult,
} from '../types/benchmark-config'
import type { CodeSample, RuleConfig, TestCase, Case } from '../types/test-case'
import type { ProcessedBenchmarkTask } from '../core/benchmark/run-benchmark'
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
import { runReporters } from '../reporters/run-reporters'

/** Parameters for running benchmarks based on a user configuration. */
interface RunBenchmarksFromConfigParameters {
  /** Options for the reporters. */
  reporterOptions: ReporterOptions[]

  /** The user-defined benchmark configuration. */
  userConfig: UserBenchmarkConfig

  /** User configuration directory path */
  configDirectory: string
}

/**
 * Orchestrates the entire benchmark process based on a user-provided
 * configuration.
 *
 * This function takes a `UserBenchmarkConfig` object and reporter options. It
 * performs the following main stages:
 *
 * 1. **Parallel Preparation**: a. For each test specification (`testSpec`) in
 *    `userConfig.tests`: i. Determines the specific benchmark settings
 *    (`specBenchmarkConfig`) by merging global `userConfig` settings with any
 *    overrides from the current `testSpec`. ii. For each `caseItem` within the
 *    `testSpec.cases` array: - Loads code samples using `loadCodeSamples` based
 *    on `caseItem.testPath`. - Creates a `RuleConfig` using the `testSpec`'s
 *    rule information (`ruleId`, `rulePath`) and the `caseItem`'s specific
 *    `options` and `severity`. - Generates a `TestCase` object which includes
 *    the loaded samples and the `RuleConfig`. b. All these preparation tasks
 *    (for all `testSpec`s and their `caseItem`s) are executed in parallel using
 *    `Promise.all`. Errors during individual case processing are caught, and
 *    problematic cases are skipped.
 * 2. **Sequential Benchmarking**: a. After all test cases are prepared, the
 *    function iterates through the data मौसम for each `testSpec`. b. For each
 *    `testSpec` that has valid `TestCase`s, it calls `runBenchmark`
 *    _sequentially_. This ensures that benchmark runs for different test
 *    specifications do not interfere with each other. The call to
 *    `runBenchmark` uses the `testCases` prepared for that specific `testSpec`
 *    and its determined `specBenchmarkConfig`.
 * 3. **Reporting**: a. All `Task` results from all `runBenchmark` calls are
 *    aggregated. b. For each `Task` result, the corresponding `TestCase` (which
 *    contains the rule context) is identified. c. `runReporters` is called for
 *    each task to output or save the benchmark results.
 *
 * If no valid `TestCase` objects can be generated from the entire
 * configuration, an error is logged, and the process may exit with an error
 * code.
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
export async function runBenchmarksFromConfig(
  parameters: RunBenchmarksFromConfigParameters,
): Promise<void> {
  let { reporterOptions, configDirectory, userConfig } = parameters

  if (userConfig.tests.length === 0) {
    console.warn('User configuration contains no tests. Exiting.')
    return
  }

  let allTestSpecResults: TestSpecResult[] = []

  let allTestCasePreparationTasks = userConfig.tests.map(async testSpec => {
    let specBenchmarkConfig: BenchmarkConfig = {
      warmup: {
        iterations:
          testSpec.warmup?.iterations ??
          userConfig.warmup?.iterations ??
          DEFAULT_WARMUP_ITERATIONS,
        enabled:
          testSpec.warmup?.enabled ??
          userConfig.warmup?.enabled ??
          DEFAULT_WARMUP_ENABLED,
      },
      iterations:
        testSpec.iterations ?? userConfig.iterations ?? DEFAULT_ITERATIONS,
      timeout: testSpec.timeout ?? userConfig.timeout ?? DEFAULT_TIMEOUT_MS,
      reporters: reporterOptions,
      name: testSpec.name,
    }

    let caseProcessingPromises = testSpec.cases.map(
      async (caseItem: Case, caseIndex) => {
        try {
          let codeSamples = await loadCodeSamples(
            caseItem.testPath,
            configDirectory,
          )

          let ruleConfig: RuleConfig = {
            severity: caseItem.severity ?? DEFAULT_SEVERITY,
            options: caseItem.options,
            ruleId: testSpec.ruleId,
            path: testSpec.rulePath,
          }

          let caseNameSuffix = `Case ${caseIndex + 1}`
          let testCaseName = `${testSpec.name} - ${caseNameSuffix}`
          let testCaseId = `config-test-${testSpec.name.replaceAll(/\s+/gu, '-')}-case-${caseIndex}-${Date.now()}`

          return createTestCase({
            samples: codeSamples,
            name: testCaseName,
            rule: ruleConfig,
            id: testCaseId,
          })
        } catch (error: unknown) {
          let errorValue = error as Error
          console.warn(
            `Skipping case ${caseIndex + 1} in test "${testSpec.name}" due to an error: ${errorValue.message}`,
          )
          return null
        }
      },
    )

    let resolvedTestCases = await Promise.all(caseProcessingPromises)
    let validTestCases = resolvedTestCases.filter(
      (tc): tc is TestCase => tc !== null,
    )
    return { testCases: validTestCases, specBenchmarkConfig, testSpec }
  })

  let preparedDataForAllSpecs = await Promise.all(allTestCasePreparationTasks)

  for (let preparedData of preparedDataForAllSpecs) {
    let { specBenchmarkConfig, testCases, testSpec } = preparedData

    if (testCases.length > 0) {
      console.info(
        `Starting benchmark run for test spec "${testSpec.name}" with ${testCases.length} test case(s)...`,
      )

      let specRunSampleResults: ProcessedBenchmarkTask[] | null =
        // eslint-disable-next-line no-await-in-loop
        await runBenchmark({
          config: specBenchmarkConfig,
          configDirectory,
          testCases,
        })

      if (specRunSampleResults && specRunSampleResults.length > 0) {
        let currentTestCaseResults: TestCaseResult[] = []

        for (let tc of testCases) {
          let samplesForThisTestCase = specRunSampleResults.filter(taskResult =>
            taskResult.name.startsWith(`${tc.name} on `),
          )

          if (samplesForThisTestCase.length > 0) {
            currentTestCaseResults.push({
              samplesResults: samplesForThisTestCase,
              description: tc.description,
              name: tc.name,
              rule: tc.rule,
              id: tc.id,
            })
          }
        }

        if (currentTestCaseResults.length > 0) {
          allTestSpecResults.push({
            benchmarkConfig: {
              iterations: specBenchmarkConfig.iterations,
              timeout: specBenchmarkConfig.timeout,
              warmup: specBenchmarkConfig.warmup,
            },
            testCaseResults: currentTestCaseResults,
            rulePath: testSpec.rulePath,
            ruleId: testSpec.ruleId,
            name: testSpec.name,
          })
        }
      }
    }
  }

  if (allTestSpecResults.every(spec => spec.testCaseResults.length === 0)) {
    console.error(
      'No valid test cases or benchmark results could be generated from the user configuration. Exiting.',
    )
    process.exitCode = 1
    return
  }

  if (allTestSpecResults.length > 0) {
    console.info(
      `Benchmark run completed. ${allTestSpecResults.length} test specifications processed.`,
    )
    await runReporters(allTestSpecResults, userConfig, reporterOptions)
  }

  console.info('Benchmark run finished.')
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
 * @param {string} configDirectory - The path to the user configuration
 *   directory.
 * @returns {Promise<CodeSample[]>} A promise that resolves to an array of
 *   CodeSample objects. Each object represents a successfully loaded code
 *   sample.
 * @throws {Error} If no supported source files are found across all provided
 *   paths, or if no valid code samples could be loaded from the found files.
 */
async function loadCodeSamples(
  testPath: string[] | string,
  configDirectory: string,
): Promise<CodeSample[]> {
  let pathsToProcess = Array.isArray(testPath) ? testPath : [testPath]

  let fileArrays = await Promise.all(
    pathsToProcess.map(async currentPath => {
      let filesForCurrentPath: string[] = []
      try {
        let resolvedPath = path.resolve(configDirectory, currentPath)
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
