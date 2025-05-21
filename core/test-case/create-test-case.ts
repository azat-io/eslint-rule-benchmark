import type { RuleConfig, CodeSample, TestCase } from '../../types/test-case'

/** Parameters for creating a test case. */
interface CreateTestCaseParameters {
  samples: CodeSample[]
  rule: RuleConfig
  name: string
  id: string
}

/**
 * Creates a test case for benchmarking an ESLint rule.
 *
 * @param {CreateTestCaseParameters} parameters - Parameters for creating a test
 *   case.
 * @returns {TestCase} A configured test case.
 */
export let createTestCase = (
  parameters: CreateTestCaseParameters,
): TestCase => ({
  samples: parameters.samples,
  name: parameters.name,
  rule: parameters.rule,
  id: parameters.id,
})
