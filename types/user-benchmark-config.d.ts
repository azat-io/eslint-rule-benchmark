import type { JSRuleDefinitionTypeOptions, Linter } from 'eslint'

/** Configuration for eslint-rule-benchmark. */
export interface UserBenchmarkConfig {
  /**
   * Individual benchmark tests to run. Each test defines a rule and code to
   * test against.
   */
  tests: {
    /** Override benchmark settings for this specific test. */
    benchmarkSettings?: {
      /** Custom warmup settings for this test. */
      warmup?: {
        iterations?: number
        enabled?: boolean
      }

      /** Number of measurement iterations for this test. */
      iterations?: number

      /** Timeout in milliseconds for this test. */
      timeout?: number
    }

    /** Rule options (same structure as in ESLint config). */
    options?: JSRuleDefinitionTypeOptions['RuleOptions']

    /** Path to file(s) which will be used for testing the rule. */
    testPath: string[] | string

    /** Rule severity (0=off, 1=warn, 2=error). Default: 2 */
    severity?: Linter.Severity

    /** Path to rule implementation file (for custom rules). */
    rulePath: string

    /**
     * Rule identifier (e.g., "no-console" or
     * "@typescript-eslint/no-unused-vars").
     */
    ruleId: string

    /** Name for the benchmark test. Will be used in reports. */
    name: string
  }[]

  /** Warmup configuration. Controls JIT warmup behavior before measurements. */
  warmup?: {
    /** Number of warmup iterations to perform. */
    iterations?: number

    /** Whether to enable warmup runs before actual measurements. */
    enabled?: boolean
  }

  /** Number of measurement iterations to perform. */
  iterations?: number

  /** Timeout in milliseconds for each test run. */
  timeout?: number
}
