import { describe, expect, it } from 'vitest'

import { createBenchmarkConfig } from '../../../core/benchmark/create-benchmark-config'
import { DEFAULT_REPORTER_FORMAT } from '../../../constants'

describe('createBenchmarkConfig', () => {
  it('should create a benchmark config with default values', () => {
    let config = createBenchmarkConfig({
      name: 'Test Benchmark',
    })

    expect(config.name).toBe('Test Benchmark')
    expect(config.iterations).toBe(50)
    expect(config.timeout).toBe(300)
    expect(config.warmup.iterations).toBe(10)
    expect(config.warmup.enabled).toBeTruthy()
    expect(config.reporters).toHaveLength(1)
    expect(config.reporters[0]!.format).toBe('console')
  })

  it('should override default values with provided parameters', () => {
    let config = createBenchmarkConfig({
      reporters: [
        {
          outputPath: './custom-report.json',
          format: 'json',
        },
      ],
      warmup: {
        iterations: 10,
        enabled: false,
      },
      name: 'Custom Benchmark',
      iterations: 200,
      timeout: 10000,
    })

    expect(config.name).toBe('Custom Benchmark')
    expect(config.iterations).toBe(200)
    expect(config.timeout).toBe(10000)
    expect(config.warmup.iterations).toBe(10)
    expect(config.warmup.enabled).toBeFalsy()
    expect(config.reporters).toHaveLength(1)
    expect(config.reporters[0]!.format).toBe('json')
    expect(config.reporters[0]!.outputPath).toBe('./custom-report.json')
  })

  it('should apply default values to partially specified reporters', () => {
    let config = createBenchmarkConfig({
      reporters: [
        {
          format: 'markdown',
        },
        {
          outputPath: './report.md',
        },
      ],
      name: 'Partial Reporters Test',
    })

    expect(config.reporters).toHaveLength(2)

    expect(config.reporters[0]!.format).toBe('markdown')
    expect(config.reporters[0]!.outputPath).toBeUndefined()

    expect(config.reporters[1]!.format).toBe(DEFAULT_REPORTER_FORMAT)
    expect(config.reporters[1]!.outputPath).toBe('./report.md')
  })

  it('should handle empty reporters array', () => {
    let config = createBenchmarkConfig({
      name: 'Empty Reporters Test',
      reporters: [],
    })

    expect(config.reporters).toHaveLength(1)
    expect(config.reporters[0]!.format).toBe(DEFAULT_REPORTER_FORMAT)
    expect(config.reporters[0]!.outputPath).toBeUndefined()
  })

  it('should handle undefined reporters', () => {
    let config = createBenchmarkConfig({
      name: 'Undefined Reporters Test',
      reporters: undefined,
    })

    expect(config.reporters).toHaveLength(1)
    expect(config.reporters[0]!.format).toBe(DEFAULT_REPORTER_FORMAT)
    expect(config.reporters[0]!.outputPath).toBeUndefined()
  })
})
