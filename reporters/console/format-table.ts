import pc from 'picocolors'

import type { SingleRuleResult } from '../../runners/run-single-rule'

/**
 * Formats benchmark results as a console-friendly table.
 *
 * @param {SingleRuleResult} result - The benchmark result to format.
 * @returns {string} Formatted table string ready for console output.
 */
export let formatTable = (result: SingleRuleResult): string => {
  let { summary, rule } = result

  let formatMs = (ms: undefined | number): string =>
    ms === undefined || !Number.isFinite(ms) ? 'N/A' : `${ms.toFixed(2)} ms`

  let formatNumber = (number_: number): string => number_.toString()

  let columnWidth = 20
  let valueColumnWidth = 15

  let padColumn = (text: string): string => text.padEnd(columnWidth)

  let header = pc.bold(`Rule Benchmark Results: ${pc.cyan(rule.id)}`)

  let columnHeaders = `${pc.bold(padColumn('Metric'))} ${pc.bold('Value')}`
  let separator = pc.bold('='.repeat(columnWidth + valueColumnWidth))

  let rows = [
    `${padColumn('Mean time')} ${pc.green(formatMs(summary.meanTimeMs))}`,
    `${padColumn('Median time')} ${pc.green(formatMs(summary.medianTimeMs))}`,
    `${padColumn('Min time')} ${pc.green(formatMs(summary.minTimeMs))}`,
    `${padColumn('Max time')} ${pc.green(formatMs(summary.maxTimeMs))}`,
    `${padColumn('Total samples')} ${formatNumber(summary.totalSamples)}`,
    `${padColumn('Total warnings')} ${pc.yellow(formatNumber(summary.totalWarnings))}`,
    `${padColumn('Total errors')} ${pc.red(formatNumber(summary.totalErrors))}`,
  ]

  return [header, '', columnHeaders, separator, ...rows].join('\n')
}
