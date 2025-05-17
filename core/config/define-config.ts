import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

/**
 * Define a configuration for ESLint Rule Benchmark.
 *
 * This function provides type checking and autocompletion for configuration
 * options. It doesn't transform the config object in any way, but just returns
 * it with proper typing.
 *
 * @example
 *   // benchmark/config.ts
 *   import { defineConfig } from 'eslint-rule-benchmark'
 *
 *   export default defineConfig({
 *     iterations: 100,
 *     timeout: 500,
 *     tests: [
 *       {
 *         name: 'Test no-console rule',
 *         ruleId: 'no-console',
 *         rulePath: './path/to/rule.js',
 *         testPath: './test/fixtures/no-console.js',
 *         severity: 2,
 *       },
 *     ],
 *   })
 *
 * @param {UserBenchmarkConfig} config - User configuration object.
 * @returns {UserBenchmarkConfig} The same configuration with proper typing.
 */
export let defineConfig = (config: UserBenchmarkConfig): UserBenchmarkConfig =>
  config
