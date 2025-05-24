import type { ProcessedBenchmarkTask } from '../core/benchmark/run-benchmark'
import type { RuleConfig } from '../types/test-case'

/**
 * Aggregated result for a Test Specification, containing results for all its
 * TestCases.
 */
export interface TestSpecResult {
  /** Benchmark configuration used for this test specification. */
  benchmarkConfig: Omit<BenchmarkConfig, 'baselinePath' | 'reporters' | 'name'>

  /** Array of results for each TestCase under this test specification. */
  testCaseResults: TestCaseResult[]

  /** Optional path to the ESLint rule file for this test specification. */
  rulePath?: string

  /** ID of the ESLint rule for this test specification. */
  ruleId: string

  /** Name of the test specification (e.g., "My Rule Benchmarks"). */
  name: string
}

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

/** Result for a single test case, containing results for all its code samples. */
export interface TestCaseResult {
  /** Benchmark results for each CodeSample within this TestCase. */
  samplesResults: ProcessedBenchmarkTask[]

  /** Optional description of the TestCase. */
  description?: string

  /** Rule configuration for this TestCase. */
  rule: RuleConfig

  /** Name of the TestCase (e.g., "Test Spec Name - Case 1"). */
  name: string

  /** Unique ID of the TestCase. */
  id: string
}

/** Result of running a single rule benchmark (often for a single code sample). */
export interface SingleRuleResult {
  /** Information about the tested rule. */
  rule: {
    /** File path to the rule module (if applicable). */
    path?: string

    /** Rule identifier, usually in format "namespace/rule-name". */
    id: string
  }

  /** Processed benchmark results. */
  result: ProcessedBenchmarkTask | null
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
