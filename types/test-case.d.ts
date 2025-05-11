/** Defines a test case with all necessary information. */
export interface TestCase {
  /** Number of iterations to run. */
  iterationCount: number

  /** Code samples to test against. */
  samples: CodeSample[]

  /** Optional description of the test case. */
  description?: string

  /** Rule to test. */
  rule: RuleConfig

  /** Display name for the test case. */
  name: string

  /** Unique identifier for the test case. */
  id: string
}

/** Statistical metrics calculated from measurements. */
export interface StatisticalMetrics {
  /** Number of samples used for calculation. */
  samples: number

  /** Median execution time. */
  median: number

  /** Average execution time. */
  mean: number

  /** Minimum execution time. */
  min: number

  /** Maximum execution time. */
  max: number

  /** 95th percentile execution time. */
  p95: number
}

/** Represents an ESLint rule configuration. */
export interface RuleConfig {
  /** The severity level (0=off, 1=warn, 2=error). */
  severity: 0 | 1 | 2

  /** Optional rule configuration options. */
  options?: unknown[]

  /** The ID of the rule to test. */
  ruleId: string

  /** Path to the file containing the rule. */
  path?: string
}

/** Represents a single timing measurement. */
export interface TimingMeasurement {
  /** Memory usage in bytes (if available). */
  memoryUsageBytes?: number

  /** Execution time in milliseconds. */
  executionTimeMs: number

  /** Timestamp when measurement was taken. */
  timestamp: number
}

/** Represents a code sample used for testing. */
export interface CodeSample {
  /** Filename with extension (e.g., example.js). */
  filename: string

  /** The source code content to test. */
  code: string
}
