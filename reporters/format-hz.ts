import { formatNumber } from './format-number'

/**
 * Formats a given number of operations per second (Hz) into a string
 * representation with thousands separators.
 *
 * @param {number} hz - The number of operations per second (Hz) to format.
 * @returns {string} A string representation of the formatted Hz.
 */
export let formatHz = (hz?: number): string => {
  if (typeof hz !== 'number' || !Number.isFinite(hz)) {
    return 'N/A'
  }

  let rounded = Math.round(hz)
  let formatted = formatNumber(rounded)
  return `${formatted} ops/sec`
}
