import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type {
  SingleRuleResult,
  BenchmarkConfig,
  ReporterOptions,
} from '../../types/benchmark-config'
import type { BenchmarkMetrics } from '../../types/benchmark-metrics'

/** Options for the Markdown reporter. */
interface MarkdownReporterOptions {
  /** Path where the report should be saved. */
  outputPath?: string
}

/**
 * Creates a Markdown reporter for benchmark results.
 *
 * @param {ReporterOptions} options - Configuration options for the reporter.
 * @returns {(result: SingleRuleResult, config: BenchmarkConfig) => void} A
 *   function that saves benchmark results to a Markdown file.
 */
export let createMarkdownReporter = (
  options: ReporterOptions,
): ((result: SingleRuleResult, config: BenchmarkConfig) => void) => {
  let reporterOptions: MarkdownReporterOptions = {
    outputPath: options.outputPath,
  }

  return (result: SingleRuleResult, config: BenchmarkConfig): void => {
    let markdownContent = createMarkdownReport(result, config)

    let outputPath =
      reporterOptions.outputPath ??
      `report/benchmark-${new Date().toISOString().replaceAll(':', '-')}.md`

    saveMarkdownReport(markdownContent, outputPath)
      .then(filePath => {
        console.info(`Markdown report saved to: ${filePath}`)
      })
      .catch((error: Error) => {
        console.error(`Failed to save Markdown report: ${error.message}`)
      })
  }
}

/**
 * Creates a Markdown report from benchmark results.
 *
 * @param {SingleRuleResult} result - The benchmark result.
 * @param {BenchmarkConfig} config - The benchmark configuration.
 * @returns {string} A formatted Markdown string with benchmark results.
 */
let createMarkdownReport = (
  result: SingleRuleResult,
  config: BenchmarkConfig,
): string => {
  let timestamp = new Date().toISOString()
  let { rule } = result
  let metrics = result.result?.metrics

  let formatMs = (valueInMs?: number): string =>
    valueInMs === undefined || !Number.isFinite(valueInMs)
      ? 'N/A'
      : `${valueInMs.toFixed(5)} ms`

  if (!metrics) {
    return [
      createHeader(config, rule, timestamp),
      '## Error',
      '',
      'No benchmark results available.',
      '',
      createConfigSection(config),
    ].join('\n\n')
  }

  let sections = [
    createHeader(config, rule, timestamp),
    createSummaryTable(metrics, formatMs),
    createPercentileDistribution(metrics, formatMs),
    createConfigSection(config),
  ]

  return sections.join('\n\n')
}

/**
 * Creates the header section of the Markdown report.
 *
 * @param {BenchmarkConfig} config - The benchmark configuration.
 * @param {{ id: string }} rule - The ESLint rule information.
 * @param {string} rule.id - The ID of the ESLint rule.
 * @param {string} rule.path - The path of the ESLint rule.
 * @param {string} timestamp - The timestamp of the report.
 * @returns {string} The formatted header section.
 */
let createHeader = (
  config: BenchmarkConfig,
  rule: { path?: string; id: string },
  timestamp: string,
): string =>
  [
    `# ESLint Rule Benchmark Report`,
    `## ${config.name}`,
    '',
    `**Rule ID:** \`${rule.id}\``,
    rule.path ? `**Rule Path:** \`${rule.path}\`` : '',
    `**Generated:** ${new Date(timestamp).toLocaleString()}`,
  ].join('\n')

/**
 * Creates a Markdown table with the summary of benchmark results.
 *
 * @param {BenchmarkMetrics} metrics - The benchmark metrics data.
 * @param {(valueInMs?: number) => string} formatMsFunction - The formatting
 *   function for milliseconds.
 * @returns {string} A formatted Markdown table.
 */
let createSummaryTable = (
  metrics: BenchmarkMetrics,
  formatMsFunction: (valueInMs?: number) => string,
): string =>
  [
    '## Performance Summary',
    '',
    '| Metric | Value |',
    '| ------ | ----- |',
    `| Operations per second | ${Math.round(metrics.hz)} |`,
    `| Average time | ${formatMsFunction(metrics.mean)} |`,
    `| Median time (P50) | ${formatMsFunction(metrics.median)} |`,
    `| Minimum time | ${formatMsFunction(metrics.min)} |`,
    `| Maximum time | ${formatMsFunction(metrics.max)} |`,
    `| P75 Percentile | ${formatMsFunction(metrics.p75)} |`,
    `| P99 Percentile | ${formatMsFunction(metrics.p99)} |`,
    `| Standard deviation | ${formatMsFunction(metrics.stdDev)} |`,
    `| Total samples | ${metrics.sampleCount} |`,
  ].join('\n')

/**
 * Creates a Markdown section with percentile distribution information.
 *
 * @param {BenchmarkMetrics} metrics - The benchmark metrics data.
 * @param {(valueInMs?: number) => string} formatMsFunction - The formatting
 *   function for milliseconds.
 * @returns {string} A formatted Markdown section.
 */
let createPercentileDistribution = (
  metrics: BenchmarkMetrics,
  formatMsFunction: (valueInMs?: number) => string,
): string =>
  [
    '## Percentile Distribution',
    '',
    'The following table shows how execution time is distributed across percentiles:',
    '',
    '| Percentile | Time |',
    '| ---------- | ---- |',
    `| 50% (Median) | ${formatMsFunction(metrics.median)} |`,
    `| 75% | ${formatMsFunction(metrics.p75)} |`,
    `| 99% | ${formatMsFunction(metrics.p99)} |`,
    '',
    '> *Note: These percentiles indicate the execution time that X% of samples performed better than.*',
  ].join('\n')

/**
 * Creates a configuration section with benchmark settings.
 *
 * @param {BenchmarkConfig} config - The benchmark configuration.
 * @returns {string} A formatted Markdown section with configuration details.
 */
let createConfigSection = (config: BenchmarkConfig): string =>
  [
    '## Benchmark Configuration',
    '',
    '| Setting | Value |',
    '| ------- | ----- |',
    `| Iterations | ${config.iterations} |`,
    `| Timeout | ${config.timeout} ms |`,
    `| Warmup Enabled | ${config.warmup.enabled} |`,
    `| Warmup Iterations | ${config.warmup.iterations} |`,
  ].join('\n')

/**
 * Saves a Markdown report to a file.
 *
 * @param {string} markdown - The markdown content to save.
 * @param {string} filePath - The path where to save the file.
 * @returns {Promise<string>} A promise that resolves with the file path.
 */
let saveMarkdownReport = async (
  markdown: string,
  filePath: string,
): Promise<string> => {
  let directoryPath = dirname(filePath)
  await mkdir(directoryPath, { recursive: true })

  await writeFile(filePath, markdown, 'utf8')
  return filePath
}

/**
 * Markdown reporter factory function.
 *
 * @param {ReporterOptions} options - Options for the Markdown reporter.
 * @returns {(result: SingleRuleResult, config: BenchmarkConfig) => void}
 *   Reporter function.
 */
export let markdownReporter = (
  options: ReporterOptions,
): ((result: SingleRuleResult, config: BenchmarkConfig) => void) =>
  createMarkdownReporter(options)
