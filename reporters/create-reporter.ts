import type { TestSpecResult, ReporterFormat } from '../types/benchmark-config'
import type { UserBenchmarkConfig } from '../types/user-benchmark-config'

import { useMarkdownReport } from './use-markdown-report'
import { useConsoleReport } from './use-console-report'
import { useJsonReport } from './use-json-report'

/** Registry of available reporters. */
let reporters: Record<
  ReporterFormat,
  (results: TestSpecResult[], config: UserBenchmarkConfig) => string
> = {
  markdown: useMarkdownReport,
  console: useConsoleReport,
  json: useJsonReport,
}

/**
 * Creates a reporter based on the specified options.
 *
 * @param {TestSpecResult[]} results - An array of results for all test
 *   specifications.
 * @param {UserBenchmarkConfig} userConfig - The user's benchmark configuration.
 * @param {ReporterFormat} format - The format of the report.
 * @returns {string} The formatted report as a string.
 */
export let createReporter = (
  results: TestSpecResult[],
  userConfig: UserBenchmarkConfig,
  format: ReporterFormat = 'console',
): string => {
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

  return reporters[format](results, userConfig)
}
