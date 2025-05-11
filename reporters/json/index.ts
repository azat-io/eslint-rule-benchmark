import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type {
  BenchmarkConfig,
  ReporterOptions,
} from '../../types/benchmark-config'
import type { SingleRuleResult } from '../../runners/run-single-rule'

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
  let benchmarkResult = result.result?.result

  if (!benchmarkResult) {
    return {
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

  let formatMs = (ms: undefined | number): string | null =>
    ms === undefined || !Number.isFinite(ms) ? null : `${ms.toFixed(2)} ms`

  return {
    metrics: {
      operationsPerSecond: Math.round(benchmarkResult.throughput.mean),
      marginOfError: `±${benchmarkResult.latency.rme.toFixed(2)}%`,
      standardDeviation: formatMs(benchmarkResult.latency.sd),
      totalSamples: benchmarkResult.latency.samples.length,
      averageTime: formatMs(benchmarkResult.latency.mean),
      minimumTime: formatMs(benchmarkResult.latency.min),
      maximumTime: formatMs(benchmarkResult.latency.max),
      medianTime: formatMs(benchmarkResult.latency.p50),
      totalTime: formatMs(benchmarkResult.totalTime),
      runtimeVersion: benchmarkResult.runtimeVersion,
      p995: formatMs(benchmarkResult.latency.p995),
      p999: formatMs(benchmarkResult.latency.p999),
      p75: formatMs(benchmarkResult.latency.p75),
      p99: formatMs(benchmarkResult.latency.p99),
      period: formatMs(benchmarkResult.period),
      runtime: benchmarkResult.runtime,
    },
    config: {
      iterations: config.iterations,
      timeout: config.timeout,
      warmup: config.warmup,
      name: config.name,
    },
    raw: {
      throughput: benchmarkResult.throughput,
      latency: benchmarkResult.latency,
    },
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
