import pc from 'picocolors'

import type { SingleRuleResult } from '../../runners/run-single-rule'

import { highlightImportantMetrics } from './highlight-important-metrics'
import { formatTable } from './format-table'

/** Options for printing benchmark summary. */
interface PrintSummaryOptions {
  /** Threshold for slow execution time in milliseconds. */
  slowThresholdMs?: number
}

/**
 * Prints a summary of benchmark results to the console.
 *
 * @param {SingleRuleResult} result - The benchmark result to print.
 * @param {PrintSummaryOptions} options - Options for printing.
 * @returns {void}
 */
export let printSummary = (
  result: SingleRuleResult,
  options: PrintSummaryOptions = {},
): void => {
  let { slowThresholdMs = 50 } = options

  console.info(formatTable(result))

  console.info(`\n${pc.bold('Highlights:')}`)
  let highlights = highlightImportantMetrics(result, {
    slowThresholdMs,
  })

  for (let highlight of highlights) {
    console.info(highlight)
  }

  console.info('')
}
