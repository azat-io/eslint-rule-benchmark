import type {
  BenchmarkConfig,
  ReporterOptions,
} from '../types/benchmark-config'
import type { SingleRuleResult } from '../runners/run-single-rule'

import { markdownReporter } from './markdown'
import { consoleReporter } from './console'
import { jsonReporter } from './json'

/** Registry of available reporters. */
let reporters = {
  markdown: markdownReporter,
  console: consoleReporter,
  json: jsonReporter,
}

/** Reporter function type. */
type ReporterFunction = (
  result: SingleRuleResult,
  config: BenchmarkConfig,
) => void

/**
 * Creates a reporter based on the specified options.
 *
 * @param {ReporterOptions} options - Reporter configuration options.
 * @returns {ReporterFunction} A configured reporter function.
 */
let createReporter = (options: ReporterOptions): ReporterFunction => {
  let { format = 'console' } = options

  if (!(format in reporters)) {
    throw new Error(
      `Unknown reporter format "${format}". Available formats: ${new Intl.ListFormat(
        'en',
        {
          type: 'conjunction',
          style: 'long',
        },
      ).format(Object.keys(reporters))}`,
    )
  }

  return reporters[format](options)
}

/**
 * Runs all configured reporters for the benchmark result.
 *
 * @param {SingleRuleResult} result - The benchmark result to report.
 * @param {BenchmarkConfig} config - The benchmark configuration.
 * @returns {void}
 */
export let runReporters = (
  result: SingleRuleResult,
  config: BenchmarkConfig,
): void => {
  for (let reporterOptions of config.reporters) {
    try {
      let reporter = createReporter(reporterOptions)
      reporter(result, config)
    } catch (error) {
      console.error(
        `Error in reporter "${reporterOptions.format}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }
}
