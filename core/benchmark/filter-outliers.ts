/**
 * Filters outliers from an array of numbers using Tukey's fences method.
 *
 * @example
 *   const data = [10, 12, 15, 11, 13, 100, 9, 14]
 *   const { filteredSamples, outliersRemovedCount } = filterOutliers(data)
 *   // filteredSamples might be [10, 12, 15, 11, 13, 9, 14]
 *   // outliersRemovedCount would be 1
 *
 * @param samples - The array of numbers (e.g., execution times in ns).
 * @param [multiplier] - The multiplier for the IQR (Interquartile Range).
 * @returns An object containing the filtered samples and the count of removed
 *   outliers.
 */
export function filterOutliers(
  samples: number[],
  multiplier: number = 1.5,
): { outliersRemovedCount: number; filteredSamples: number[] } {
  if (samples.length === 0) {
    return { outliersRemovedCount: 0, filteredSamples: [] }
  }

  let sortedSamples = [...samples].toSorted((a, b) => a - b)

  let q1Index = Math.floor(sortedSamples.length / 4)
  let q3Index = Math.ceil((sortedSamples.length * 3) / 4)

  let q1: number = sortedSamples[q1Index]!
  let q3: number = sortedSamples[Math.max(q3Index - 1, 0)]!

  let iqr = q3 - q1

  let lowerBound = q1 - multiplier * iqr
  let upperBound = q3 + multiplier * iqr

  let filteredSamples: number[] = []
  let outliersRemovedCount = 0

  for (let sample of sortedSamples) {
    if (sample >= lowerBound && sample <= upperBound) {
      filteredSamples.push(sample)
    } else {
      outliersRemovedCount++
    }
  }

  return {
    outliersRemovedCount,
    filteredSamples,
  }
}
