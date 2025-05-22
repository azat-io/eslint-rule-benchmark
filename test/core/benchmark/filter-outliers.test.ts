import { describe, expect, it } from 'vitest'

import { filterOutliers } from '../../../core/benchmark/filter-outliers'

describe('filterOutliers', () => {
  it('should return an empty array and 0 removed if input is empty', () => {
    let result = filterOutliers([])
    expect(result.filteredSamples).toEqual([])
    expect(result.outliersRemovedCount).toBe(0)
  })

  it('should not filter anything if all values are within Tukey fences (no outliers)', () => {
    let samples = [10, 12, 15, 11, 13, 14, 9, 16]
    let result = filterOutliers(samples)
    expect(result.filteredSamples).toEqual(
      [9, 10, 11, 12, 13, 14, 15, 16].toSorted((a, b) => a - b),
    )
    expect(result.outliersRemovedCount).toBe(0)
  })

  it('should filter out clear upper outliers', () => {
    let samples = [10, 12, 15, 11, 13, 100, 9, 14]
    let result = filterOutliers(samples)
    let expectedFiltered = [9, 10, 11, 12, 13, 14, 15].toSorted((a, b) => a - b)
    expect(result.filteredSamples).toEqual(expectedFiltered)
    expect(result.outliersRemovedCount).toBe(1)
  })

  it('should filter out clear lower outliers', () => {
    let samples = [10, 12, 15, 1, 11, 13, 9, 14]
    let result = filterOutliers(samples)
    let expectedFiltered = [9, 10, 11, 12, 13, 14, 15].toSorted((a, b) => a - b)
    expect(result.filteredSamples).toEqual(expectedFiltered)
    expect(result.outliersRemovedCount).toBe(1)
  })

  it('should filter out both upper and lower outliers', () => {
    let samples = [0, 10, 12, 15, 11, 13, 100, 9, 14, 200]
    let result = filterOutliers(samples)
    let expectedFiltered = [9, 10, 11, 12, 13, 14, 15].toSorted((a, b) => a - b)
    expect(result.filteredSamples).toEqual(expectedFiltered)
    expect(result.outliersRemovedCount).toBe(3)
  })

  it('should handle arrays with duplicate values correctly', () => {
    let samples = [10, 10, 10, 10, 10, 100]
    let result = filterOutliers(samples)
    expect(result.filteredSamples).toEqual([10, 10, 10, 10, 10])
    expect(result.outliersRemovedCount).toBe(1)
  })

  it('should handle arrays where all values are identical (no outliers)', () => {
    let samples = [10, 10, 10, 10, 10]
    let result = filterOutliers(samples)
    expect(result.filteredSamples).toEqual([10, 10, 10, 10, 10])
    expect(result.outliersRemovedCount).toBe(0)
  })

  it('should handle small arrays correctly (e.g., 1, 2, or 3 elements)', () => {
    let result1 = filterOutliers([5])
    expect(result1.filteredSamples).toEqual([5])
    expect(result1.outliersRemovedCount).toBe(0)

    let result2 = filterOutliers([5, 100])
    expect(result2.filteredSamples).toEqual([5, 100].toSorted((a, b) => a - b))
    expect(result2.outliersRemovedCount).toBe(0)

    let result3 = filterOutliers([5, 10, 100])
    expect(result3.filteredSamples).toEqual(
      [5, 10, 100].toSorted((a, b) => a - b),
    )
    expect(result3.outliersRemovedCount).toBe(0)

    let result4 = filterOutliers([5, 6, 7, 100])
    expect(result4.filteredSamples).toEqual([5, 6, 7].toSorted((a, b) => a - b))
    expect(result4.outliersRemovedCount).toBe(1)
  })

  it('should use the custom multiplier correctly', () => {
    let samples = [1, 2, 3, 4, 5, 10]
    let resultDefault = filterOutliers(samples)
    expect(resultDefault.filteredSamples).toEqual([1, 2, 3, 4, 5])
    expect(resultDefault.outliersRemovedCount).toBe(1)

    let resultCustom = filterOutliers(samples, 3)
    expect(resultCustom.filteredSamples).toEqual(
      [1, 2, 3, 4, 5, 10].toSorted((a, b) => a - b),
    )
    expect(resultCustom.outliersRemovedCount).toBe(0)
  })

  it('should handle negative numbers and zero correctly', () => {
    let samples = [-100, -10, -5, 0, 5, 10, 100]
    let result = filterOutliers(samples)
    expect(result.filteredSamples).toEqual(
      [-10, -5, 0, 5, 10].toSorted((a, b) => a - b),
    )
    expect(result.outliersRemovedCount).toBe(2)
  })
})
