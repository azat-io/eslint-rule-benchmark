import type { Task } from 'tinybench'

import type { CodeSample, RuleConfig } from '../types/test-case'
import type { BenchmarkConfig } from '../types/benchmark-config'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_REPORTER_FORMAT,
  DEFAULT_WARMUP_ENABLED,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
} from '../constants'
import { createTestCase } from '../core/test-case/create-test-case'
import { runBenchmark } from '../core/benchmark/run-benchmark'

/** Result of running a single rule benchmark. */
export interface SingleRuleResult {
  /** Information about the tested rule. */
  rule: {
    /** File path to the rule module (if applicable). */
    path?: string

    /** Rule identifier, usually in format "namespace/rule-name". */
    id: string
  }

  /** Raw benchmark run results for detailed analysis. */
  result: Task | null
}

/** Parameters for running a single rule benchmark. */
interface RunSingleRuleParameters {
  /** Benchmark configuration. */
  benchmarkConfig?: BenchmarkConfig

  /** Code samples to test the rule against. */
  codeSamples: CodeSample[]

  /** Path to custom parser (if applicable). */
  parserPath?: string

  /** Rule reference or config to benchmark. */
  rule: RuleConfig
}

/**
 * Runs performance benchmark for a single ESLint rule.
 *
 * @param {RunSingleRuleParameters} parameters - Parameters for running the
 *   single rule benchmark.
 * @returns {Promise<SingleRuleResult>} A promise that resolves to the benchmark
 *   result.
 */
export let runSingleRule = async (
  parameters: RunSingleRuleParameters,
): Promise<SingleRuleResult> => {
  let { benchmarkConfig, codeSamples, rule } = parameters

  let config = benchmarkConfig ?? {
    warmup: {
      iterations: DEFAULT_WARMUP_ITERATIONS,
      enabled: DEFAULT_WARMUP_ENABLED,
    },
    reporters: [{ format: DEFAULT_REPORTER_FORMAT }],
    iterations: DEFAULT_ITERATIONS,
    name: 'Single Rule Benchmark',
    timeout: DEFAULT_TIMEOUT_MS,
  }

  let ruleName: string

  if ('ruleId' in rule) {
    ruleName = rule.ruleId
  } else {
    ruleName = 'unknown-rule'
  }

  let ruleConfig: RuleConfig =
    'path' in rule
      ? {
          severity: rule.severity,
          options: rule.options,
          ruleId: rule.ruleId,
          path: rule.path,
        }
      : rule

  let testCase = createTestCase({
    id: `single-rule-${ruleName}-${Date.now()}`,
    name: `Rule: ${ruleName}`,
    samples: codeSamples,
    rule: ruleConfig,
  })

  let result = await runBenchmark({
    testCases: [testCase],
    config,
  })

  return {
    rule: {
      path: 'path' in rule ? rule.path : undefined,
      id: testCase.rule.ruleId,
    },
    result,
  }
}
