import type { SingleRuleResult } from '../../runners/run-single-rule'

import { formatTable } from './format-table'

/**
 * Creates a console reporter for benchmark results.
 *
 * @returns {(result: SingleRuleResult) => void} A function that reports
 *   benchmark results to the console.
 */
export let createConsoleReporter =
  (): ((result: SingleRuleResult) => void) =>
  (result: SingleRuleResult): void => {
    console.info(formatTable(result))
  }

/**
 * Console reporter factory function.
 *
 * @returns {(result: SingleRuleResult) => void} Reporter function.
 */
export let consoleReporter = (): ((result: SingleRuleResult) => void) =>
  createConsoleReporter()
