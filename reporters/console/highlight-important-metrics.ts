import pc from 'picocolors'

import type { SingleRuleResult } from '../../runners/run-single-rule'

/** Options for highlighting important metrics. */
interface HighlightImportantMetricsOptions {
  /** Threshold for slow execution time in milliseconds. */
  slowThresholdMs?: number
}

/**
 * Highlights important metrics from a benchmark result.
 *
 * @param {SingleRuleResult} result - The benchmark result to analyze.
 * @param {HighlightImportantMetricsOptions} options - Options for highlighting.
 * @returns {string[]} Array of highlighted metrics as strings.
 */
export let highlightImportantMetrics = (
  result: SingleRuleResult,
  options: HighlightImportantMetricsOptions = {},
): string[] => {
  let { slowThresholdMs = 50 } = options
  let { summary } = result
  let highlights: string[] = []

  if (summary.meanTimeMs > slowThresholdMs) {
    let message = `⚠️  Mean execution time (${summary.meanTimeMs.toFixed(
      2,
    )} ms) exceeds threshold of ${slowThresholdMs} ms`

    highlights.push(pc.yellow(message))
  }

  if (summary.maxTimeMs > slowThresholdMs * 2) {
    let message = `⚠️  Max execution time (${summary.maxTimeMs.toFixed(
      2,
    )} ms) is significantly high`

    highlights.push(pc.yellow(message))
  }

  if (summary.totalErrors > 0) {
    let message = `ℹ️  Rule found ${summary.totalErrors} errors in test code`

    highlights.push(pc.cyan(message))
  }

  if (summary.totalWarnings > 0) {
    let message = `ℹ️  Rule found ${summary.totalWarnings} warnings in test code`

    highlights.push(pc.cyan(message))
  }

  if (highlights.length === 0) {
    let message = '✅ All metrics are within expected ranges'

    highlights.push(pc.green(message))
  }

  return highlights
}
