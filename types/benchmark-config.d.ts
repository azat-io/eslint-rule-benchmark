/** Main configuration for a benchmark run. */
export interface BenchmarkConfig {
  /** Reporter options. */
  reporters: ReporterOptions[]

  /** Path to compare results against (if applicable). */
  baselinePath?: string

  /** Warmup configuration. */
  warmup: WarmupConfig

  /** Number of measurement iterations to perform. */
  iterations: number

  /** Timeout in milliseconds for each test run. */
  timeout: number

  /** Name of the benchmark. */
  name: string
}

/** Configuration for benchmark warmup. */
export interface WarmupConfig {
  /** Number of warmup iterations to perform. */
  iterations: number

  /** Whether to enable warmup runs before actual measurements. */
  enabled: boolean
}

/** Options for report generation. */
export interface ReporterOptions {
  /** Format of the report output. */
  format: ReporterFormat

  /** Path where the report should be saved (if applicable). */
  outputPath?: string
}

/** Report format for benchmark results. */
export type ReporterFormat = 'markdown' | 'console' | 'json'
