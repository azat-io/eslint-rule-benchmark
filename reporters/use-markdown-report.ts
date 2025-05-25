import type { UserBenchmarkConfig } from '../types/user-benchmark-config'
import type { TestSpecResult } from '../types/benchmark-config'
import type { SystemInfo } from './collect-system-info'

import { collectSystemInfo } from './collect-system-info'
import { formatDeviation } from './format-deviation'
import { formatMs } from './format-ms'
import { formatHz } from './format-hz'

/**
 * Formats system information into markdown format.
 *
 * @param {SystemInfo} systemInfo - System information to format.
 * @returns {string} Formatted system information in markdown.
 */
let formatSystemInfoMarkdown = (systemInfo: SystemInfo): string => {
  let runTime = [
    `Node.js ${systemInfo.nodeVersion}`,
    `V8 ${systemInfo.v8Version}`,
    `ESLint ${systemInfo.eslintVersion}`,
  ]

  let platform = [
    `${systemInfo.platform} ${systemInfo.arch} (${systemInfo.osRelease})`,
  ]

  let hardware = [
    `${systemInfo.cpuModel} (${systemInfo.cpuCount} cores, ${systemInfo.cpuSpeedMHz} MHz)`,
    `${systemInfo.totalMemoryGb} GB RAM`,
  ]

  let formatList = new Intl.ListFormat('en-US', {
    type: 'conjunction',
    style: 'narrow',
  })

  return [
    '### System Information',
    '',
    `**Runtime:** ${formatList.format(runTime)}`,
    `**Platform:** ${formatList.format(platform)}`,
    `**Hardware:** ${formatList.format(hardware)}`,
  ].join('\n')
}

/**
 * Creates a markdown reporter for aggregated benchmark results.
 *
 * @param {TestSpecResult[]} results - An array of results for all test
 *   specifications.
 * @param {UserBenchmarkConfig} _userConfig - The user's benchmark
 *   configuration.
 * @returns {Promise<string>} Formatted markdown report as a string.
 */
export let useMarkdownReport = async (
  results: TestSpecResult[],
  _userConfig?: UserBenchmarkConfig,
): Promise<string> => {
  let outputLines: string[] = []

  if (results.length === 0) {
    return 'No benchmark results available.'
  }

  outputLines.push('## ESLint Rule Benchmark Report')

  for (let i = 0; i < results.length; i++) {
    let testSpecResult = results[i]!

    outputLines.push('', `### ${testSpecResult.name}`, '')

    if (testSpecResult.testCaseResults.length === 0) {
      outputLines.push(
        'No test cases found or all failed for this specification.',
      )
      continue
    }

    let tableRows: string[] = []

    tableRows.push(
      '| Sample | Ops/sec | Avg Time | Median | Min | Max | StdDev |',
      '| ------ | ------- | -------- | ------ | --- | --- | ------ |',
    )

    for (let testCaseResult of testSpecResult.testCaseResults) {
      if (testCaseResult.samplesResults.length === 0) {
        tableRows.push(`| No samples | N/A | N/A | N/A | N/A | N/A | N/A |`)
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
          formatDeviation(sampleResult.metrics.stdDev),
        ]

        tableRows.push(`| ${rowData.join(' | ')} |`)
      }
    }

    outputLines.push(...tableRows)

    if (i < results.length - 1) {
      outputLines.push('')
    }
  }

  let systemInfo = await collectSystemInfo()
  outputLines.push('', formatSystemInfoMarkdown(systemInfo))

  return outputLines.join('\n')
}
