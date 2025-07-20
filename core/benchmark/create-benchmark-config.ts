import type {
  BenchmarkConfig,
  ReporterOptions,
  WarmupConfig,
} from '../../types/benchmark-config'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_REPORTER_FORMAT,
  DEFAULT_WARMUP_ENABLED,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
} from '../../constants'

/** Parameters for creating a benchmark configuration. */
interface CreateBenchmarkConfigParameters {
  /** Reporter configuration. */
  reporters?: Partial<ReporterOptions>[]

  /** Warmup configuration. */
  warmup?: Partial<WarmupConfig>

  /** Path to compare results against (if applicable). */
  baselinePath?: string

  /** Number of measurement iterations to perform. */
  iterations?: number

  /** Timeout in milliseconds for each test run. */
  timeout?: number

  /** Name of the benchmark. */
  name: string
}

/**
 * Creates a benchmark configuration with default settings.
 *
 * @param {CreateBenchmarkConfigParameters} parameters - Parameters for the
 *   benchmark configuration.
 * @returns {BenchmarkConfig} A configured benchmark configuration.
 */
export function createBenchmarkConfig(
  parameters: CreateBenchmarkConfigParameters,
): BenchmarkConfig {
  let warmup: WarmupConfig = {
    iterations: parameters.warmup?.iterations ?? DEFAULT_WARMUP_ITERATIONS,
    enabled: parameters.warmup?.enabled ?? DEFAULT_WARMUP_ENABLED,
  }

  let reporters: ReporterOptions[] = []
  if (!parameters.reporters || parameters.reporters.length === 0) {
    reporters.push({
      format: DEFAULT_REPORTER_FORMAT,
    })
  } else {
    reporters = parameters.reporters.map(reporter => ({
      format: reporter.format ?? DEFAULT_REPORTER_FORMAT,
      outputPath: reporter.outputPath,
    }))
  }

  return {
    iterations: parameters.iterations ?? DEFAULT_ITERATIONS,
    timeout: parameters.timeout ?? DEFAULT_TIMEOUT_MS,
    baselinePath: parameters.baselinePath,
    name: parameters.name,
    reporters,
    warmup,
  }
}
