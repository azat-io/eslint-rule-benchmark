import { formatNumber } from './format-number'

/**
 * Formats a given number of milliseconds into a string representation with
 * thousands separators.
 *
 * @param {number} milliseconds - The number of milliseconds to format.
 * @returns {string} A string representation of the formatted milliseconds.
 */
export function formatMs(milliseconds?: number): string {
  if (typeof milliseconds !== 'number' || !Number.isFinite(milliseconds)) {
    return 'N/A'
  }

  let fixed = milliseconds.toFixed(3)
  let [integerPart, decimalPart] = fixed.split('.')
  let formattedInteger = formatNumber(Number(integerPart))
  return `${formattedInteger}.${decimalPart} ms`
}
