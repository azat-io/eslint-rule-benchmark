/**
 * Represents calculated statistical metrics for a benchmark task. Time-based
 * values (mean, median, min, max, p75, p99, stdDev) are in nanoseconds. Period
 * is in seconds.
 */
export interface BenchmarkMetrics {
  /** Number of samples used to calculate these metrics. */
  sampleCount: number

  /** Median (P50) execution time in nanoseconds. */
  median: number

  /** Standard deviation of execution times in nanoseconds. */
  stdDev: number

  /** Average time per operation in seconds. */
  period: number

  /** Mean (average) execution time in nanoseconds. */
  mean: number

  /** Minimum execution time in nanoseconds. */
  min: number

  /** Maximum execution time in nanoseconds. */
  max: number

  /** 75th percentile execution time in nanoseconds. */
  p75: number

  /** 99th percentile execution time in nanoseconds. */
  p99: number

  /** Operations per second (hz). */
  hz: number
}
