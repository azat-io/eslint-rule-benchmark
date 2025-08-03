import 'node:worker_threads'
import path from 'node:path'
import cac from 'cac'

import type { ReporterOptions, ReporterFormat } from '../types/benchmark-config'
import type { UserBenchmarkConfig } from '../types/user-benchmark-config'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_REPORTER_FORMAT,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
} from '../constants'
import { runBenchmarksFromConfig } from '../runners/run-benchmarks-from-config'
import { validateConfig } from '../core/config/validate-config'
import { loadConfig } from '../core/config/load-config'
import { version } from '../package.json'

/**
 * Defines the command-line options for the 'run-single' command. This command
 * benchmarks a single ESLint rule against specified source code.
 */
interface RunSingleCommandOptions {
  /**
   * Specifies the output format for the benchmark report (e.g., 'console',
   * 'json', 'markdown').
   */
  report: ReporterFormat

  /** Optional path to an ESLint configuration file to use for linting. */
  eslintConfig?: string

  /** Maximum allowed duration in ms. */
  maxDuration: number

  /** The number of iterations to run the benchmark for the rule. */
  iterations: number

  /** Optional path to a file where the benchmark report should be saved. */
  output?: string

  /**
   * Path to the directory or file containing code samples to test the rule
   * against.
   */
  source: string

  /** The number of warmup iterations to perform before actual measurements. */
  warmup: number

  /** Path to the JavaScript/TypeScript file implementing the ESLint rule. */
  rule: string

  /**
   * The identifier (name) of the ESLint rule to benchmark (e.g.,
   * 'my-plugin/my-rule').
   */
  name: string
}

/**
 * Defines the command-line options for the 'run' command. This command executes
 * benchmarks based on a benchmark configuration file.
 */
interface RunCommandOptions {
  /**
   * Optional. Specifies the output format for the benchmark report (e.g.,
   * 'console', 'json', 'markdown').
   */
  report?: ReporterFormat

  /** Optional. Path to an ESLint configuration file to use for linting. */
  eslintConfig?: string

  /**
   * Optional. Path to the benchmark configuration file. If not provided,
   * searches for default config files.
   */
  config?: string

  /** Optional. Path to a file where the benchmark report should be saved. */
  output?: string
}

/**
 * Initializes and runs the command-line interface for the ESLint Rule Benchmark
 * tool.
 *
 * This function sets up the CLI using 'cac', defining two main commands:
 *
 * - 'run': Executes benchmarks based on a benchmark configuration file (see
 *   `UserBenchmarkConfig`). Allows overriding some reporter options via CLI
 *   flags.
 * - 'run-single': Executes a benchmark for a single ESLint rule. All parameters
 *   (rule path, source code path, benchmark settings) are provided via CLI
 *   flags. This command internally constructs a `UserBenchmarkConfig` object
 *   with one test specification, which in turn contains a single test case
 *   derived from the CLI options.
 *
 * It parses command-line arguments and delegates to the appropriate command
 * actions.
 */
export function run(): void {
  let cli = cac('eslint-rule-benchmark')

  cli.version(version).help()

  cli
    .command('run', 'Run benchmarks from config')
    .option('--config <path>', 'Path to configuration file')
    .option('--eslint-config <config>', 'Path to ESLint config file')
    .option('--report <format>', 'Report format (console, json, markdown)', {
      default: DEFAULT_REPORTER_FORMAT,
    })
    .option('--output <file>', 'Output file for the report')
    .action(async (options: RunCommandOptions) => {
      try {
        let { filepath, config } = await loadConfig(options.config)

        let configDirectory = path.dirname(filepath)

        let errors = await validateConfig(config, configDirectory)
        if (errors.length > 0) {
          console.error('Configuration validation errors:')
          for (let error of errors) {
            console.error(`- ${error}`)
          }
          process.exit(1)
        }

        let reporterOptionsArray: ReporterOptions[] = [
          {
            format: options.report ?? DEFAULT_REPORTER_FORMAT,
            outputPath: options.output,
          },
        ]

        await runBenchmarksFromConfig({
          eslintConfigFile: options.eslintConfig,
          reporterOptions: reporterOptionsArray,
          userConfig: config,
          configDirectory,
        })
      } catch (error) {
        let errorValue = error as Error
        console.error(`Error: ${errorValue.message}`)
        process.exit(1)
      }
    })

  cli
    .command('run-single', 'Run benchmark on a single ESLint rule')
    .option('--rule <rule>', 'Path to the ESLint rule file')
    .option('--name <name>', 'Name of the rule to benchmark')
    .option('--eslint-config <config>', 'Path to ESLint config file')
    .option('--source <source>', 'Path to directory or file with test cases')
    .option('--iterations <number>', 'Number of benchmark iterations', {
      default: DEFAULT_ITERATIONS,
    })
    .option('--warmup <number>', 'Number of warmup iterations', {
      default: DEFAULT_WARMUP_ITERATIONS,
    })
    .option(
      '--max-duration <number>',
      'Target time in ms for benchmarking (lower values = fewer iterations)',
      {
        default: DEFAULT_TIMEOUT_MS,
      },
    )
    .option('--report <format>', 'Report format (console, json, markdown)', {
      default: DEFAULT_REPORTER_FORMAT,
    })
    .option('--output <file>', 'Output file for the report')
    .action(async (options: RunSingleCommandOptions) => {
      try {
        if (!options.rule) {
          throw new Error('Rule path (--rule) is required')
        }
        if (!options.name) {
          throw new Error('Rule name/ID (--name) is required')
        }
        if (!options.source) {
          throw new Error('Source path (--source) is required')
        }

        let reporterOptionsArray: ReporterOptions[] = [
          {
            outputPath: options.output,
            format: options.report,
          },
        ]

        let constructedUserConfig: UserBenchmarkConfig = {
          tests: [
            {
              cases: [
                {
                  testPath: options.source,
                },
              ],
              name: `CLI: ${options.name}`,
              rulePath: options.rule,
              ruleId: options.name,
            },
          ],
          warmup: {
            iterations: options.warmup > 0 ? options.warmup : undefined,
            enabled: options.warmup > 0,
          },
          iterations: options.iterations > 0 ? options.iterations : undefined,
          timeout: options.maxDuration > 0 ? options.maxDuration : undefined,
        }

        let configDirectory = process.cwd()
        let errors = await validateConfig(
          constructedUserConfig,
          configDirectory,
        )
        if (errors.length > 0) {
          console.error('Constructed configuration validation errors:')
          for (let error of errors) {
            console.error(`- ${error}`)
          }
          process.exit(1)
        }

        console.info(`Running benchmark for rule ${options.name}...`)
        console.info(`Using rule file: ${options.rule}`)
        console.info(`Using source: ${options.source}`)

        await runBenchmarksFromConfig({
          eslintConfigFile: options.eslintConfig,
          reporterOptions: reporterOptionsArray,
          userConfig: constructedUserConfig,
          configDirectory,
        })
      } catch (error) {
        let errorValue = error as Error
        console.error(`Error: ${errorValue.message}`)
        process.exit(1)
      }
    })

  cli.parse()
}
