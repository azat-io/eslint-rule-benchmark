import type { TableUserConfig } from 'table'

import { getBorderCharacters, table } from 'table'

import type { SingleRuleResult } from '../../runners/run-single-rule'

/**
 * Formats benchmark results as a console-friendly table.
 *
 * @param {SingleRuleResult} result - The benchmark result to format.
 * @returns {void} Formatted table string ready for console output.
 */
export let formatTable = (result: SingleRuleResult): string => {
  let { rule } = result
  let benchmarkResult = result.result?.result

  if (!benchmarkResult) {
    return 'No benchmark results available.'
  }

  let formatMs = (ms: undefined | number): string =>
    ms === undefined || !Number.isFinite(ms) ? 'N/A' : `${ms.toFixed(2)} ms`

  let config: TableUserConfig = {
    header: {
      content: `Rule Benchmark Results: ${rule.id}`,
      alignment: 'center',
      wrapWord: false,
    },
    columns: {
      0: { wrapWord: false, width: 40 },
      1: { wrapWord: false, width: 20 },
    },
    border: getBorderCharacters('norc'),
    singleLine: true,
  }

  let data = [
    ['Metric', 'Value'],
    [
      'Operations per second',
      Math.round(benchmarkResult.throughput.mean).toString(),
    ],
    ['Average time', formatMs(benchmarkResult.latency.mean)],
    ['Median time (P50)', formatMs(benchmarkResult.latency.p50)],
    ['Minimum time', formatMs(benchmarkResult.latency.min)],
    ['Maximum time', formatMs(benchmarkResult.latency.max)],
    ['P75 Percentile', formatMs(benchmarkResult.latency.p75)],
    ['P99 Percentile', formatMs(benchmarkResult.latency.p99)],
    ['Standard deviation', formatMs(benchmarkResult.latency.sd)],
    ['Relative margin of error', `±${benchmarkResult.latency.rme.toFixed(2)}%`],
    ['Total samples', benchmarkResult.latency.samples.length.toString()],
  ]

  return table(data, config)
}
