import { formatMs } from './format-ms'

/**
 * Formats a deviation value in milliseconds for display.
 *
 * @param deviation - The deviation value in milliseconds.
 * @returns A formatted string representing the deviation.
 */
export function formatDeviation(deviation: number): string {
  if (typeof deviation !== 'number' || !Number.isFinite(deviation)) {
    return 'N/A'
  }
  return `±${formatMs(deviation)}`
}
