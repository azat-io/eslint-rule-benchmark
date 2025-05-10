import { Bench } from 'tinybench'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_WARMUP_TIME_MS,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
} from './constants'

/** Options for configuring a benchmark instance. */
interface CreateBenchOptions {
  /** Number of warmup iterations to perform. */
  warmupIterations?: number

  /** Number of iterations to run. */
  iterations?: number

  /** Timeout in milliseconds. */
  timeoutMs?: number

  /** Whether to enable warmup runs. */
  warmup?: boolean
}

/**
 * Creates a Tinybench benchmark instance with the specified configuration.
 *
 * @param {CreateBenchOptions} options - Benchmark configuration options.
 * @returns {Bench} Configured Tinybench instance ready for use.
 */
export let createBench = (options: CreateBenchOptions = {}): Bench =>
  new Bench({
    warmupIterations: options.warmup
      ? (options.warmupIterations ?? DEFAULT_WARMUP_ITERATIONS)
      : 0,
    warmupTime: options.warmup ? DEFAULT_WARMUP_TIME_MS : 0,
    iterations: options.iterations ?? DEFAULT_ITERATIONS,
    time: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  })
