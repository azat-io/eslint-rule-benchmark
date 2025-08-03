import type { BenchmarkMetrics } from '../../types/benchmark-metrics'

/**
 * Calculates various statistical metrics from an array of numbers. Assumes
 * input samples are in nanoseconds for time-based metrics.
 *
 * @param samples - The array of numbers (e.g., execution times in ns). Should
 *   not be empty. If it might be, the caller should handle that case.
 * @returns An object containing calculated metrics.
 */
export function calculateStatistics(samples: number[]): BenchmarkMetrics {
  if (samples.length === 0) {
    return {
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
  }

  let sortedSamples = [...samples].sort((a, b) => a - b)
  let count = sortedSamples.length

  let sum = sortedSamples.reduce((accumulator, value) => accumulator + value, 0)
  let mean = sum / count

  let min = sortedSamples[0]!
  let max = sortedSamples[count - 1]!

  let median: number
  if (count % 2 === 0) {
    median = (sortedSamples[count / 2 - 1]! + sortedSamples[count / 2]!) / 2
  } else {
    median = sortedSamples[Math.floor(count / 2)]!
  }

  let p75Index = Math.ceil(0.75 * count) - 1
  let p99Index = Math.ceil(0.99 * count) - 1
  let p75 = sortedSamples[Math.max(0, p75Index)]!
  let p99 = sortedSamples[Math.max(0, p99Index)]!

  let variance =
    sortedSamples.reduce(
      (accumulator, value) => accumulator + (value - mean) ** 2,
      0,
    ) / count
  let standardDeviation = Math.sqrt(variance)

  let period = mean / 1000
  let hz = period > 0 ? 1 / period : 0

  return {
    stdDev: standardDeviation,
    sampleCount: count,
    median,
    period,
    mean,
    min,
    max,
    p75,
    p99,
    hz,
  }
}
