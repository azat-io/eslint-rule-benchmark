import type { RuleConfig, CodeSample, TestCase } from '../../types/test-case'

/** Parameters for creating a test case for ESLint rule benchmarking. */
interface CreateTestCaseParameters {
  /**
   * Array of code samples to benchmark the ESLint rule against. Each sample
   * represents a piece of code that will be linted.
   */
  samples: CodeSample[]

  /**
   * Configuration for the ESLint rule being tested. Includes rule ID, options,
   * and severity level.
   */
  rule: RuleConfig

  /**
   * Human-readable name for this test case. Typically follows format "Test Spec
   * Name - Case Description".
   */
  name: string

  /**
   * Unique identifier for this test case. Used for tracking results and
   * generating reports.
   */
  id: string
}

/**
 * Creates a test case for benchmarking an ESLint rule.
 *
 * @param {CreateTestCaseParameters} parameters - Parameters for creating a test
 *   case.
 * @returns {TestCase} A configured test case.
 */
export function createTestCase(parameters: CreateTestCaseParameters): TestCase {
  return {
    samples: parameters.samples,
    name: parameters.name,
    rule: parameters.rule,
    id: parameters.id,
  }
}
