import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

/**
 * Define a configuration for ESLint Rule Benchmark.
 *
 * This function provides type checking and autocompletion for configuration
 * options. It doesn't transform the config object in any way, but just returns
 * it with proper typing.
 *
 * @example
 *   // benchmark.config.ts
 *   import { defineConfig } from 'eslint-rule-benchmark'
 *
 *   export default defineConfig({
 *     // Global settings (optional)
 *     iterations: 100,
 *     warmup: { iterations: 10, enabled: true },
 *     timeout: 500,
 *
 *     tests: [
 *       // Array of test specifications
 *       {
 *         name: 'My Rule: Specific Scenarios',
 *         ruleId: 'my-plugin/my-rule',
 *         rulePath: './rules/my-rule.js',
 *         // Test-specific benchmark settings (optional, overrides globals)
 *         iterations: 50,
 *         warmup: { iterations: 5 },
 *
 *         cases: [
 *           // Array of test cases for 'My Rule'
 *           {
 *             name: 'Case with specific options', // Optional case name
 *             testPath: './test-files/my-rule/case1.js',
 *             options: [{ strict: true }],
 *             severity: 2,
 *           },
 *           {
 *             testPath: './test-files/my-rule/case2.js',
 *             // Uses default severity and no options
 *           },
 *           {
 *             testPath: [
 *               // Multiple paths for one case
 *               './test-files/my-rule/edge-caseA.ts',
 *               './test-files/my-rule/edge-caseB.ts',
 *             ],
 *           },
 *         ],
 *       },
 *       {
 *         name: 'Core ESLint Rule: no-unused-vars',
 *         ruleId: 'no-unused-vars', // rulePath can be omitted for core rules
 *         cases: [
 *           {
 *             testPath: './large-project-snippet.js',
 *           },
 *         ],
 *       },
 *     ],
 *   })
 *
 * @param config - User configuration object.
 * @returns The same configuration with proper typing.
 */
export function defineConfig(config: UserBenchmarkConfig): UserBenchmarkConfig {
  return config
}
