import { describe, expect, it } from 'vitest'
import { Bench } from 'tinybench'

import {
  DEFAULT_WARMUP_ITERATIONS,
  DEFAULT_WARMUP_TIME_MS,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
} from '../../../constants'
import { createBench } from '../../../core/benchmark/create-bench'

describe('createBench', () => {
  it('should create a bench instance with default values', () => {
    let bench = createBench()

    expect(bench).toBeInstanceOf(Bench)

    expect(bench.iterations).toBe(DEFAULT_ITERATIONS)
    expect(bench.time).toBe(DEFAULT_TIMEOUT_MS)
    expect(bench.warmupTime).toBe(0)
    expect(bench.warmupIterations).toBe(0)
  })

  it('should create a bench instance with custom values', () => {
    let customIterations = 500
    let customTimeout = 10000

    let bench = createBench({
      iterations: customIterations,
      timeoutMs: customTimeout,
      warmup: false,
    })

    expect(bench).toBeInstanceOf(Bench)
    expect(bench.iterations).toBe(customIterations)
    expect(bench.time).toBe(customTimeout)
    expect(bench.warmupTime).toBe(0)
    expect(bench.warmupIterations).toBe(0)
  })

  it('should enable warmup with default values when warmup=true', () => {
    let bench = createBench({
      warmup: true,
    })

    expect(bench).toBeInstanceOf(Bench)
    expect(bench.warmupTime).toBe(DEFAULT_WARMUP_TIME_MS)
    expect(bench.warmupIterations).toBe(DEFAULT_WARMUP_ITERATIONS)
  })

  it('should enable warmup with custom iterations', () => {
    let customWarmupIterations = 10

    let bench = createBench({
      warmupIterations: customWarmupIterations,
      warmup: true,
    })

    expect(bench).toBeInstanceOf(Bench)
    expect(bench.warmupTime).toBe(DEFAULT_WARMUP_TIME_MS)
    expect(bench.warmupIterations).toBe(customWarmupIterations)
  })

  it('should ignore warmupIterations when warmup=false', () => {
    let customWarmupIterations = 10

    let bench = createBench({
      warmupIterations: customWarmupIterations,
      warmup: false,
    })

    expect(bench).toBeInstanceOf(Bench)
    expect(bench.warmupTime).toBe(0)
    expect(bench.warmupIterations).toBe(0)
  })
})
