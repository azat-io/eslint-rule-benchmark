import type { SingleRuleResult } from '../../runners/run-single-rule'
import type { BenchmarkConfig } from '../../types/benchmark-config'

import { printSummary } from './print-summary'

/**
 * Creates a console reporter for benchmark results.
 *
 * @returns {(result: SingleRuleResult, config: BenchmarkConfig) => void} A
 *   function that reports benchmark results to the console.
 */
export let createConsoleReporter =
  (): ((result: SingleRuleResult, config: BenchmarkConfig) => void) =>
  (result: SingleRuleResult, config: BenchmarkConfig): void => {
    printSummary(result, {
      slowThresholdMs: config.timeout / 100,
    })
  }

/**
 * Console reporter factory function.
 *
 * @returns {(result: SingleRuleResult, config: BenchmarkConfig) => void}
 *   Reporter function.
 */
export let consoleReporter = (): ((
  result: SingleRuleResult,
  config: BenchmarkConfig,
) => void) => createConsoleReporter()
