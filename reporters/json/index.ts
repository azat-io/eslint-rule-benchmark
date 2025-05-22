import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type {
  SingleRuleResult,
  BenchmarkConfig,
  ReporterOptions,
} from '../../types/benchmark-config'

/** Options for the JSON reporter. */
interface JsonReporterOptions {
  /** Path where the report should be saved. */
  outputPath?: string
}

/**
 * Creates a JSON reporter for benchmark results.
 *
 * @param {ReporterOptions} options - Configuration options for the reporter.
 * @returns {(result: SingleRuleResult, config: BenchmarkConfig) => void} A
 *   function that saves benchmark results to a JSON file.
 */
export let createJsonReporter = (
  options: ReporterOptions,
): ((result: SingleRuleResult, config: BenchmarkConfig) => void) => {
  let reporterOptions: JsonReporterOptions = {
    outputPath: options.outputPath,
  }

  return (result: SingleRuleResult, config: BenchmarkConfig): void => {
    let report = createJsonReport(result, config)

    let outputPath =
      reporterOptions.outputPath ??
      `report/benchmark-${new Date().toISOString().replaceAll(':', '-')}.json`
    saveJsonReport(report, outputPath)
      .then(filePath => {
        console.info(`JSON report saved to: ${filePath}`)
      })
      .catch((error: Error) => {
        console.error(`Failed to save JSON report: ${error.message}`)
      })
  }
}

/**
 * Creates a JSON report object from benchmark results.
 *
 * @param {SingleRuleResult} result - The benchmark result.
 * @param {BenchmarkConfig} config - The benchmark configuration.
 * @returns {object} A structured JSON object with benchmark results.
 */
let createJsonReport = (
  result: SingleRuleResult,
  config: BenchmarkConfig,
): object => {
  let metrics = result.result?.metrics // Changed to use our BenchmarkMetrics

  if (!metrics) {
    return {
      // Config and rule info remain the same for error case
      config: {
        iterations: config.iterations,
        timeout: config.timeout,
        warmup: config.warmup,
        name: config.name,
      },
      rule: {
        path: result.rule.path,
        id: result.rule.id,
      },
      error: 'No benchmark results available',
      timestamp: new Date().toISOString(),
    }
  }

  // FormatMs now expects milliseconds and formats them
  let formatMs = (valueInMs?: number): string | null =>
    valueInMs === undefined || !Number.isFinite(valueInMs)
      ? null
      : `${valueInMs.toFixed(5)} ms`

  return {
    metrics: {
      operationsPerSecond: Math.round(metrics.hz),
      // MarginOfError: Removed
      standardDeviation: formatMs(metrics.stdDev),
      medianTime: formatMs(metrics.median),
      averageTime: formatMs(metrics.mean),
      minimumTime: formatMs(metrics.min),
      maximumTime: formatMs(metrics.max),
      totalSamples: metrics.sampleCount,
      periodInSeconds: metrics.period, // Stored as a number in seconds
      // TotalTime: Removed
      // RuntimeVersion: Removed
      // P995: Removed
      // P999: Removed
      p75: formatMs(metrics.p75),
      p99: formatMs(metrics.p99),
      // Runtime: Removed
    },
    config: {
      iterations: config.iterations,
      timeout: config.timeout,
      warmup: config.warmup,
      name: config.name,
    },
    // Raw: Removed
    rule: {
      path: result.rule.path,
      id: result.rule.id,
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Saves a JSON report to a file.
 *
 * @param {object} report - The report data to save.
 * @param {string} filePath - The path where to save the file.
 * @returns {Promise<string>} A promise that resolves with the file path.
 */
let saveJsonReport = async (
  report: object,
  filePath: string,
): Promise<string> => {
  let directoryPath = dirname(filePath)
  await mkdir(directoryPath, { recursive: true })

  let jsonString = JSON.stringify(report, null, 2)
  await writeFile(filePath, jsonString, 'utf8')

  return filePath
}

/**
 * JSON reporter factory function.
 *
 * @param {ReporterOptions} options - Options for the JSON reporter.
 * @returns {(result: SingleRuleResult, config: BenchmarkConfig) => void}
 *   Reporter function.
 */
export let jsonReporter = (
  options: ReporterOptions,
): ((result: SingleRuleResult, config: BenchmarkConfig) => void) =>
  createJsonReporter(options)
