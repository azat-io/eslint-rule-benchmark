import fs from 'node:fs/promises'
import path from 'node:path'
import cac from 'cac'

import type { ReporterOptions, ReporterFormat } from '../types/benchmark-config'
import type { CodeSample } from '../types/test-case'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_REPORTER_FORMAT,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
} from '../constants'
import { createBenchmarkConfig } from '../core/benchmark/create-benchmark-config'
import { runSingleRule } from '../runners/run-single-rule'
import { runReporters } from '../reporters'
import { version } from '../package.json'

/** Options for the benchmark run command. */
interface RunCommandOptions {
  /** Report format. */
  report: ReporterFormat

  /** Maximum allowed duration in ms. */
  maxDuration: number

  /** Number of benchmark iterations. */
  iterations: number

  /** Path to ESLint config file. */
  config?: string

  /** Output file for the report. */
  output?: string

  /** Path to directory with test cases. */
  source: string

  /** Number of warmup iterations. */
  warmup: number

  /** Path to the ESLint rule file. */
  rule: string

  /** Name of the rule to benchmark. */
  name: string
}

/**
 * Command-line interface for ESLint Rule Benchmark.
 *
 * @returns {void}
 */
export let run = (): void => {
  let cli = cac('eslint-rule-benchmark')

  cli.version(version).help()

  cli
    .command('run', 'Run benchmark on a single ESLint rule')
    .option('--rule <rule>', 'Path to the ESLint rule file')
    .option('--name <name>', 'Name of the rule to benchmark')
    .option('--config <config>', 'Path to ESLint config file')
    .option('--source <source>', 'Path to directory with test cases')
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
    .option(
      '--report <format>',
      'Report format (console, json, markdown, html)',
      {
        default: DEFAULT_REPORTER_FORMAT,
      },
    )
    .option('--output <file>', 'Output file for the report')
    .action(async (options: RunCommandOptions) => {
      try {
        if (!options.rule) {
          throw new Error('Rule path (--rule) is required')
        }

        if (!options.name) {
          throw new Error('Rule name (--name) is required')
        }

        if (!options.source) {
          throw new Error('Source option is required')
        }

        let reporterOptions: ReporterOptions = {
          outputPath: options.output,
          format: options.report,
        }

        let sourceFiles: string[]
        try {
          let sourcePath = path.resolve(process.cwd(), options.source)
          let sourceStats = await fs.stat(sourcePath)

          if (sourceStats.isDirectory()) {
            let files = await fs.readdir(sourcePath)
            sourceFiles = files
              .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
              .map(file => path.join(sourcePath, file))
          } else {
            sourceFiles = [sourcePath]
          }
        } catch (error) {
          let errorValue = error as Error
          throw new Error(`Error reading source files: ${errorValue.message}`)
        }

        if (sourceFiles.length === 0) {
          throw new Error('No source files found')
        }

        let codeSamples: CodeSample[] = []

        await Promise.all(
          sourceFiles.map(async file => {
            try {
              let code = await fs.readFile(file, 'utf8')
              codeSamples.push({
                filename: path.basename(file),
                code,
              })
            } catch (error) {
              let errorValue = error as Error
              console.warn(`Skipping file ${file}: ${errorValue.message}`)
            }
          }),
        )

        if (codeSamples.length === 0) {
          throw new Error('No valid source files found')
        }

        let benchmarkConfig = createBenchmarkConfig({
          warmup: {
            iterations: Math.max(1, options.warmup),
            enabled: options.warmup > 0,
          },
          timeout:
            options.maxDuration > 0 ? options.maxDuration : DEFAULT_TIMEOUT_MS,
          iterations: Math.max(1, options.iterations),
          name: `Benchmark for rule ${options.name}`,
          reporters: [reporterOptions],
        })

        console.info(`Running benchmark for rule ${options.name}...`)
        console.info(`Using rule file: ${options.rule}`)
        console.info(
          `Using ${codeSamples.length} source files from ${options.source}`,
        )

        let result = await runSingleRule({
          rule: {
            ruleId: options.name,
            path: options.rule,
            severity: 2,
          },
          benchmarkConfig,
          codeSamples,
        })

        runReporters(result, benchmarkConfig)
      } catch (error) {
        console.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        )
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1)
      }
    })

  cli.parse()
}
