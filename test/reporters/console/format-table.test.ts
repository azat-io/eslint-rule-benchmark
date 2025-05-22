import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import type { ProcessedBenchmarkTask } from '../../../core/benchmark/run-benchmark'
import type { BenchmarkMetrics } from '../../../types/benchmark-metrics'
import type { SingleRuleResult } from '../../../types/benchmark-config'

import { formatTable } from '../../../reporters/console/format-table'

let createMockMetrics = (
  overrides: Partial<BenchmarkMetrics> = {},
): BenchmarkMetrics => ({
  sampleCount: 10,
  period: 0.001,
  stdDev: 0.05,
  median: 0.9,
  p75: 1.05,
  min: 0.8,
  max: 1.2,
  p99: 1.1,
  hz: 1000,
  mean: 1,
  ...overrides,
})

let createMockProcessedTask = (
  metricOverrides: Partial<BenchmarkMetrics> = {},
): ProcessedBenchmarkTask => ({
  metrics: createMockMetrics(metricOverrides),
  name: 'test-benchmark-task',
})

describe('formatTable', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a table with metrics', () => {
    let mockTask = createMockProcessedTask()
    let string_ = formatTable({
      rule: { id: 'rule-1' },
      result: mockTask,
    } as SingleRuleResult)

    expect(string_).toMatchSnapshot()
  })

  it('prints "N/A" for NaN metrics', () => {
    let mockTaskWithNaN = createMockProcessedTask({
      median: Number.NaN,
      stdDev: Number.NaN,
      period: Number.NaN,
      mean: Number.NaN,
      min: Number.NaN,
      max: Number.NaN,
      p75: Number.NaN,
      p99: Number.NaN,
      hz: Number.NaN,
    })
    let string_ = formatTable({
      result: mockTaskWithNaN,
      rule: { id: 'rule-1' },
    } as SingleRuleResult)

    expect(string_).toMatchSnapshot()
  })

  it('returns message when no benchmark data', () => {
    let string_ = formatTable({ rule: { id: 'rule-1' } } as SingleRuleResult)
    expect(string_).toBe('No benchmark results available.')
  })
})
