import type { TaskResult } from 'tinybench'

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type {
  BenchmarkConfig,
  ReporterOptions,
} from '../../types/benchmark-config'
import type { SingleRuleResult } from '../../runners/run-single-rule'

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
let createMarkdownReporter = (
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
  let benchmarkResult = result.result?.result

  if (!benchmarkResult) {
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
    createSummaryTable(benchmarkResult),
    createPercentileDistribution(benchmarkResult),
    createConfigSection(config),
    createSystemInfo(benchmarkResult),
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
    `## ${config.name || 'Benchmark Results'}`,
    '',
    `**Rule ID:** \`${rule.id}\``,
    rule.path ? `**Rule Path:** \`${rule.path}\`` : '',
    `**Generated:** ${new Date(timestamp).toLocaleString()}`,
  ].join('\n')

/**
 * Creates a Markdown table with the summary of benchmark results.
 *
 * @param {TaskResult} benchmarkResult - The benchmark result data.
 * @returns {string} A formatted Markdown table.
 */
let createSummaryTable = (benchmarkResult: TaskResult): string => {
  let formatMs = (ms: undefined | number): string =>
    ms === undefined || !Number.isFinite(ms) ? 'N/A' : `${ms.toFixed(2)} ms`

  return [
    '## Performance Summary',
    '',
    '| Metric | Value |',
    '| ------ | ----- |',
    `| Operations per second | ${Math.round(benchmarkResult.throughput.mean)} |`,
    `| Average time | ${formatMs(benchmarkResult.latency.mean)} |`,
    `| Median time (P50) | ${formatMs(benchmarkResult.latency.p50)} |`,
    `| Minimum time | ${formatMs(benchmarkResult.latency.min)} |`,
    `| Maximum time | ${formatMs(benchmarkResult.latency.max)} |`,
    `| P75 Percentile | ${formatMs(benchmarkResult.latency.p75)} |`,
    `| P99 Percentile | ${formatMs(benchmarkResult.latency.p99)} |`,
    `| Standard deviation | ${formatMs(benchmarkResult.latency.sd)} |`,
    `| Relative margin of error | ±${benchmarkResult.latency.rme.toFixed(2)}% |`,
    `| Total samples | ${benchmarkResult.latency.samples.length} |`,
  ].join('\n')
}

/**
 * Creates a Markdown section with percentile distribution information.
 *
 * @param {TaskResult} benchmarkResult - The benchmark result data.
 * @returns {string} A formatted Markdown section.
 */
let createPercentileDistribution = (benchmarkResult: TaskResult): string => {
  let formatMs = (ms: undefined | number): string =>
    ms === undefined || !Number.isFinite(ms) ? 'N/A' : `${ms.toFixed(2)} ms`

  return [
    '## Percentile Distribution',
    '',
    'The following table shows how execution time is distributed across percentiles:',
    '',
    '| Percentile | Time |',
    '| ---------- | ---- |',
    `| 50% (Median) | ${formatMs(benchmarkResult.latency.p50)} |`,
    `| 75% | ${formatMs(benchmarkResult.latency.p75)} |`,
    `| 99% | ${formatMs(benchmarkResult.latency.p99)} |`,
    `| 99.5% | ${formatMs(benchmarkResult.latency.p995)} |`,
    `| 99.9% | ${formatMs(benchmarkResult.latency.p999)} |`,
    '',
    '> *Note: These percentiles indicate the execution time that X% of samples performed better than.*',
  ].join('\n')
}

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
 * Creates a section with system information.
 *
 * @param {TaskResult} benchmarkResult - The benchmark result data.
 * @returns {string} A formatted Markdown section with system information.
 */
let createSystemInfo = (benchmarkResult: TaskResult): string =>
  [
    '## System Information',
    '',
    '| Property | Value |',
    '| -------- | ----- |',
    `| Runtime | ${benchmarkResult.runtime} |`,
    `| Runtime Version | ${benchmarkResult.runtimeVersion} |`,
    `| Total Run Time | ${benchmarkResult.totalTime.toFixed(2)} ms |`,
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
