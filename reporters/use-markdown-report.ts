import type { UserBenchmarkConfig } from '../types/user-benchmark-config'
import type { TestSpecResult } from '../types/benchmark-config'

import { formatNumber } from './format-number'
import { formatMs } from './format-ms'
import { formatHz } from './format-hz'

/**
 * Creates a markdown reporter for aggregated benchmark results.
 *
 * @param {TestSpecResult[]} results - An array of results for all test
 *   specifications.
 * @param {UserBenchmarkConfig} _userConfig - The user's benchmark
 *   configuration.
 * @returns {string} Formatted markdown report as a string.
 */
export let useMarkdownReport = (
  results: TestSpecResult[],
  _userConfig?: UserBenchmarkConfig,
): string => {
  let outputLines: string[] = []

  if (results.length === 0) {
    return 'No benchmark results available.'
  }

  outputLines.push('# ESLint Rule Benchmark Report')

  for (let i = 0; i < results.length; i++) {
    let testSpecResult = results[i]!

    outputLines.push('', `## ${testSpecResult.name}`, '')

    if (testSpecResult.testCaseResults.length === 0) {
      outputLines.push(
        'No test cases found or all failed for this specification.',
      )
      continue
    }

    let tableRows: string[] = []

    tableRows.push(
      '| Sample | Ops/sec | Avg Time | Median | Min | Max | StdDev | Samples |',
      '| ------ | ------- | -------- | ------ | --- | --- | ------ | ------- |',
    )

    for (let testCaseResult of testSpecResult.testCaseResults) {
      if (testCaseResult.samplesResults.length === 0) {
        tableRows.push(
          `| No samples | N/A | N/A | N/A | N/A | N/A | N/A | N/A |`,
        )
        continue
      }

      for (let sampleResult of testCaseResult.samplesResults) {
        let sampleName = sampleResult.name.replace(
          `${testCaseResult.name} on `,
          '',
        )
        let rowData = [
          sampleName,
          formatHz(sampleResult.metrics.hz),
          formatMs(sampleResult.metrics.mean),
          formatMs(sampleResult.metrics.median),
          formatMs(sampleResult.metrics.min),
          formatMs(sampleResult.metrics.max),
          formatMs(sampleResult.metrics.stdDev),
          formatNumber(sampleResult.metrics.sampleCount),
        ]

        tableRows.push(`| ${rowData.join(' | ')} |`)
      }
    }

    outputLines.push(...tableRows)

    if (i < results.length - 1) {
      outputLines.push('')
    }
  }

  return outputLines.join('\n')
}
