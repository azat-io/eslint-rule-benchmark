import type { SingleRuleResult } from '../../types/benchmark-config'

type Alignment = 'center' | 'left'

const MIN_COLUMN_WIDTH = 5
const CELL_PADDING = 1

/**
 * Pads a cell value to fit the target width. If the value is longer than the
 * target width, it will be returned as is. If the value is shorter, it will be
 * padded with spaces. The alignment can be either 'left' or 'center'.
 *
 * @param {string} value - Value to pad.
 * @param {number} targetWidth - Target width of the cell after padding.
 * @param {Alignment} alignment - Alignment of the cell content.
 * @returns {string} Padded cell value.
 */
let padCell = (
  value: string,
  targetWidth: number,
  alignment: Alignment,
): string => {
  if (value.length >= targetWidth) {
    return value
  }

  let gap = targetWidth - value.length
  if (alignment === 'left') {
    return value + ' '.repeat(gap)
  }

  let left = Math.floor(gap / 2)
  let right = gap - left
  return ' '.repeat(left) + value + ' '.repeat(right)
}

/**
 * Builds a separator line for the table based on the column widths and padding.
 *
 * @param {number[]} columnWidths - Array of column widths.
 * @param {number[]} leftPads - Array of left padding sizes.
 * @param {number[]} rightPads - Array of right padding sizes.
 * @returns {string} Separator line for the table.
 */
let buildSeparator = (
  columnWidths: number[],
  leftPads: number[],
  rightPads: number[],
): string =>
  columnWidths
    .map((width, i) => '-'.repeat(width + leftPads[i]! + rightPads[i]!))
    .join('|')

/**
 * Renders a table from the given rows. Each row is an array of strings. The
 * table will be formatted with proper padding and separators.
 *
 * @param {string[][]} rows - Array of rows, where each row is an array of
 *   strings.
 * @returns {string} Formatted table as a string.
 */
let renderTable = (rows: string[][]): string => {
  let columnCount = Math.max(...rows.map(row => row.length))
  let columnWidths = Array.from({ length: columnCount }, (_, i) =>
    Math.max(...rows.map(row => (row[i] ?? '').length), MIN_COLUMN_WIDTH),
  )

  let leftPads = columnWidths.map((_, i) => (i === 0 ? 0 : CELL_PADDING))
  let rightPads = columnWidths.map((_, i) =>
    i === columnCount - 1 ? 0 : CELL_PADDING,
  )

  let separator = buildSeparator(columnWidths, leftPads, rightPads)
  let tableWidth = separator.length

  let lines: string[] = [separator]

  for (let [rowIndex, row] of rows.entries()) {
    if (rowIndex === 0 && row.length === 1) {
      let header = padCell(row[0]!, tableWidth, 'center')
      lines.push(header, separator)
      continue
    }

    let rendered = row
      .map((cell, col) => {
        let content = padCell(cell, columnWidths[col]!, 'left')
        let leftSpace = ' '.repeat(leftPads[col]!)
        let rightSpace = ' '.repeat(rightPads[col]!)
        return leftSpace + content + rightSpace
      })
      .join('|')

    lines.push(rendered)
  }

  lines.push(separator)
  return lines.join('\n')
}

/**
 * Formats the benchmark results of a single rule into a table format.
 *
 * @param {SingleRuleResult} result - The result object containing rule and
 *   benchmark data.
 * @returns {string} Formatted table as a string.
 */
export let formatTable = (result: SingleRuleResult): string => {
  let { rule } = result
  let bench = result.result?.result
  if (!bench) {
    return 'No benchmark results available.'
  }

  let ms = (number?: number): string =>
    typeof number !== 'number' || !Number.isFinite(number)
      ? 'N/A'
      : `${number.toFixed(2)} ms`

  let rows: string[][] = [
    [`Rule Benchmark Results: ${rule.id}`],
    ['Operations per second', Math.round(bench.throughput.mean).toString()],
    ['Average time', ms(bench.latency.mean)],
    ['Median time (P50)', ms(bench.latency.p50)],
    ['Minimum time', ms(bench.latency.min)],
    ['Maximum time', ms(bench.latency.max)],
    ['P75 Percentile', ms(bench.latency.p75)],
    ['P99 Percentile', ms(bench.latency.p99)],
    ['Standard deviation', ms(bench.latency.sd)],
    ['Relative margin of error', `±${bench.latency.rme.toFixed(2)} %`],
    ['Total samples', bench.latency.samples.length.toString()],
  ]

  return renderTable(rows)
}
