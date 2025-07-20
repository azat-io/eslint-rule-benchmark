import { describe, expect, it } from 'vitest'

import type { BenchmarkMetrics } from '../../../types/benchmark-metrics'

import { calculateStatistics } from '../../../core/benchmark/calculate-statistics'

describe('calculateStatistics', () => {
  function isApproximatelyEqual(
    value1: number,
    value2: number,
    epsilon: number = 1e-9,
  ): boolean {
    return Math.abs(value1 - value2) < epsilon
  }

  it('should return zeroed metrics for an empty array', () => {
    let expectedMetrics: BenchmarkMetrics = {
      sampleCount: 0,
      median: 0,
      stdDev: 0,
      period: 0,
      mean: 0,
      min: 0,
      max: 0,
      p75: 0,
      p99: 0,
      hz: 0,
    }
    expect(calculateStatistics([])).toEqual(expectedMetrics)
  })

  it('should correctly calculate metrics for a single element array', () => {
    let samples = [10]
    let metrics = calculateStatistics(samples)
    expect(metrics.sampleCount).toBe(1)
    expect(metrics.mean).toBe(10)
    expect(metrics.median).toBe(10)
    expect(metrics.min).toBe(10)
    expect(metrics.max).toBe(10)
    expect(metrics.p75).toBe(10)
    expect(metrics.p99).toBe(10)
    expect(metrics.stdDev).toBe(0)
    expect(metrics.period).toBe(10 / 1000)
    expect(metrics.hz).toBe(1 / (10 / 1000))
  })

  it('should correctly calculate metrics for a simple array', () => {
    let samples = [10, 20, 30, 40, 50]
    let metrics = calculateStatistics(samples)
    expect(metrics.sampleCount).toBe(5)
    expect(metrics.mean).toBe(30)
    expect(metrics.median).toBe(30)
    expect(metrics.min).toBe(10)
    expect(metrics.max).toBe(50)
    expect(metrics.p75).toBe(40)
    expect(metrics.p99).toBe(50)
    expect(isApproximatelyEqual(metrics.stdDev, Math.sqrt(200))).toBeTruthy()
    expect(metrics.period).toBe(30 / 1000)
    expect(isApproximatelyEqual(metrics.hz, 1 / 0.03)).toBeTruthy()
  })

  it('should correctly calculate median for an even number of samples', () => {
    let samples = [10, 20, 30, 40]
    let metrics = calculateStatistics(samples)
    expect(metrics.median).toBe(25)
  })

  it('should correctly calculate metrics when all samples are identical', () => {
    let samples = [25, 25, 25, 25]
    let metrics = calculateStatistics(samples)
    expect(metrics.sampleCount).toBe(4)
    expect(metrics.mean).toBe(25)
    expect(metrics.median).toBe(25)
    expect(metrics.min).toBe(25)
    expect(metrics.max).toBe(25)
    expect(metrics.p75).toBe(25)
    expect(metrics.p99).toBe(25)
    expect(metrics.stdDev).toBe(0)
    expect(metrics.period).toBe(25 / 1000)
    expect(metrics.hz).toBe(1 / (25 / 1000))
  })

  it('should calculate percentiles accurately for a larger dataset', () => {
    let samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    let metrics = calculateStatistics(samples)
    expect(metrics.median).toBe(5.5)
    expect(metrics.p75).toBe(8)
    expect(metrics.p99).toBe(10)
  })

  it('should handle small float values correctly (simulating ms times)', () => {
    let samples = [0.0527, 0.0528, 0.0543, 0.0548, 0.0577]
    let samplesCount = samples.length
    let mean =
      samples.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0,
      ) / samplesCount
    let period = mean / 1000
    let hz = 1 / period

    let metrics = calculateStatistics(samples)
    expect(metrics.sampleCount).toBe(samplesCount)
    expect(isApproximatelyEqual(metrics.mean, mean)).toBeTruthy()
    expect(metrics.median).toBe(0.0543)
    expect(metrics.min).toBe(0.0527)
    expect(metrics.max).toBe(0.0577)
    expect(metrics.p75).toBe(0.0548)
    expect(metrics.p99).toBe(0.0577)
    expect(isApproximatelyEqual(metrics.period, period)).toBeTruthy()
    expect(isApproximatelyEqual(metrics.hz, hz)).toBeTruthy()
  })

  it('should correctly calculate hz as 0 if period is 0 or negative', () => {
    let samplesAllZeros = [0, 0, 0, 0]
    let metricsAllZeros = calculateStatistics(samplesAllZeros)
    expect(metricsAllZeros.mean).toBe(0)
    expect(metricsAllZeros.period).toBe(0)
    expect(metricsAllZeros.hz).toBe(0)

    let samplesMeanZero = [-10, 0, 10]
    let metricsMeanZero = calculateStatistics(samplesMeanZero)
    expect(metricsMeanZero.mean).toBe(0)
    expect(metricsMeanZero.period).toBe(0)
    expect(metricsMeanZero.hz).toBe(0)
  })
})
