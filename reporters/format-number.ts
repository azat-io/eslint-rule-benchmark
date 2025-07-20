/**
 * Formats a number by rounding it to the nearest integer and converting it to a
 * localized string.
 *
 * @param {number} value - The number to format. If the value is not a valid
 *   number, it returns 'N/A'.
 * @returns {string} A string representation of the formatted number.
 */
export function formatNumber(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A'
  }

  return value.toLocaleString('en-US')
}
