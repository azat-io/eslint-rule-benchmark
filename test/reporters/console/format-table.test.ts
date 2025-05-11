import type { TaskResult, Bench } from 'tinybench'

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import type { SingleRuleResult } from '../../../runners/run-single-rule'

import { formatTable } from '../../../reporters/console/format-table'

let makeTinybenchResult = (over: Partial<Bench> = {}): Partial<Bench> =>
  ({
    latency: {
      samples: Array.from({ length: 10 }).fill(1),
      p75: 1.05,
      rme: 1.11,
      min: 0.8,
      max: 1.2,
      p99: 1.2,
      sd: 0.05,
      mean: 1,
      p50: 1,
      ...over,
    },
    throughput: { mean: 1234 },
    runtimeVersion: 'v20.11.1',
    runtime: 'node',
    period: 0.001,
    totalTime: 2,
    ...over,
  }) as Partial<Bench>

describe('formatTable', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a table with metrics', () => {
    let string_ = formatTable({
      result: { result: makeTinybenchResult() },
      rule: { id: 'rule-1' },
    } as SingleRuleResult)

    expect(string_).toMatchSnapshot()
  })

  it('prints "N/A" for NaN metrics', () => {
    let string_ = formatTable({
      result: {
        result: makeTinybenchResult({
          latency: {
            mean: Number.NaN,
            p50: Number.NaN,
            min: Number.NaN,
            max: Number.NaN,
            p75: Number.NaN,
            p99: Number.NaN,
            sd: Number.NaN,
            samples: [],
            rme: 0,
          },
        } as unknown as Partial<TaskResult>),
      },
      rule: { id: 'rule-1' },
    } as SingleRuleResult)

    expect(string_).toMatchSnapshot()
  })

  it('returns message when no benchmark data', () => {
    let string_ = formatTable({ rule: { id: 'rule-1' } } as SingleRuleResult)
    expect(string_).toBe('No benchmark results available.')
  })
})
