import type { Case } from './test-case'

/** Configuration for eslint-rule-benchmark. */
export interface UserBenchmarkConfig extends BaseBenchmarkSettings {
  /**
   * An array of benchmark test specifications. Each test specification defines
   * a rule, a name, and one or more test cases to run against that rule. Each
   * test specification can also override global benchmark settings.
   */
  tests: (BaseBenchmarkSettings & Test)[]
}

/** Defines base benchmark settings that can be applied globally or per test. */
interface BaseBenchmarkSettings {
  /**
   * Warmup settings. Controls JIT warmup behavior before measurements. Can be
   * set globally or overridden per test.
   */
  warmup?: {
    /**
     * Number of warmup iterations to perform. Higher values may provide more
     * stable results but increase execution time.
     */
    iterations?: number

    /**
     * Whether to enable warmup runs before actual measurements. Defaults to
     * true.
     */
    enabled?: boolean
  }

  /**
   * Number of measurement iterations to perform for each code sample. Higher
   * values lead to more precise results but longer execution. Can be set
   * globally or overridden per test.
   */
  iterations?: number

  /**
   * Timeout in milliseconds for each individual code sample benchmark run. Can
   * be set globally or overridden per test.
   */
  timeout?: number
}

/** Defines a single benchmark test specification. */
interface Test {
  /** Path to rule implementation file (for custom rules). */
  rulePath: string

  /**
   * Rule identifier (e.g., "no-console" or
   * "@typescript-eslint/no-unused-vars").
   */
  ruleId: string

  /**
   * An array of test cases to run for this rule. Each case defines specific
   * code samples and can have its own ESLint rule options and severity.
   */
  cases: Case[]

  /** Name for this group of benchmark cases. Will be used in reports. */
  name: string
}
