import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type {
  BenchmarkConfig,
  ReporterOptions,
} from '../../types/benchmark-config'
import type { SingleRuleResult } from '../../runners/run-single-rule'

/** Summary statistics from benchmark runs. */
interface BenchmarkSummary {
  /** Total number of warnings reported by the linting rules. */
  totalWarnings: number

  /** Total number of code samples or iterations measured. */
  totalSamples: number

  /** Median execution time in milliseconds. */
  medianTimeMs: number

  /** Total number of errors reported by the linting rules. */
  totalErrors: number

  /** Mean (average) execution time in milliseconds. */
  meanTimeMs: number

  /** Minimum execution time in milliseconds across all samples. */
  minTimeMs: number

  /** Maximum execution time in milliseconds across all samples. */
  maxTimeMs: number
}

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
  let { summary, rule } = result

  let sections = [
    createHeader(config, rule, timestamp),
    createSummaryTable(summary),
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
 * @param {string} timestamp - The timestamp of the report.
 * @returns {string} The formatted header section.
 */
let createHeader = (
  config: BenchmarkConfig,
  rule: { id: string },
  timestamp: string,
): string =>
  [
    `# ESLint Rule Benchmark Report`,
    `## ${config.name || 'Benchmark Results'}`,
    '',
    `**Rule ID:** \`${rule.id}\``,
    `**Generated:** ${new Date(timestamp).toLocaleString()}`,
  ].join('\n')

/**
 * Creates a Markdown table with the summary of benchmark results.
 *
 * @param {BenchmarkSummary} summary - The summary of benchmark results.
 * @returns {string} A formatted Markdown table.
 */
let createSummaryTable = (summary: BenchmarkSummary): string =>
  [
    '## Summary',
    '',
    '| Metric | Value |',
    '| ------ | ----- |',
    `| Total Samples | ${summary.totalSamples} |`,
    `| Median Time | ${summary.medianTimeMs.toFixed(2)} ms |`,
    `| Mean Time | ${summary.meanTimeMs.toFixed(2)} ms |`,
    `| Min Time | ${summary.minTimeMs.toFixed(2)} ms |`,
    `| Max Time | ${summary.maxTimeMs.toFixed(2)} ms |`,
    `| Total Warnings | ${summary.totalWarnings} |`,
    `| Total Errors | ${summary.totalErrors} |`,
  ].join('\n')

/**
 * Creates a configuration section with benchmark settings.
 *
 * @param {BenchmarkConfig} config - The benchmark configuration.
 * @returns {string} A formatted Markdown section with configuration details.
 */
let createConfigSection = (config: BenchmarkConfig): string =>
  [
    '## Configuration',
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
