import type { ProcessedBenchmarkTask } from '../core/benchmark/run-benchmark'
import type { UserBenchmarkConfig } from '../types/user-benchmark-config'
import type { TestSpecResult } from '../types/benchmark-config'
import type { SystemInfo } from './collect-system-info'

import { collectSystemInfo } from './collect-system-info'
import { formatDeviation } from './format-deviation'
import { formatHz } from './format-hz'
import { formatMs } from './format-ms'

type Alignment = 'center' | 'left'

const MIN_COLUMN_WIDTH = 5

const CELL_PADDING = 1

const TABLE_HEADERS = [
  'Sample',
  'Ops/sec',
  'Avg Time',
  'Median',
  'Min',
  'Max',
  'StdDev',
]

const EMPTY_ROW_VALUES = [
  'No samples',
  'N/A',
  'N/A',
  'N/A',
  'N/A',
  'N/A',
  'N/A',
]

/**
 * Formats system information into a compact, grouped display.
 *
 * @param {SystemInfo} systemInfo - System information to format.
 * @returns {string} Formatted system information string.
 */
let formatSystemInfo = (systemInfo: SystemInfo): string => {
  let runTime = [
    `Node.js ${systemInfo.nodeVersion}`,
    `V8 ${systemInfo.v8Version}`,
    `ESLint ${systemInfo.eslintVersion}`,
  ]

  let platform = [
    `${systemInfo.platform} ${systemInfo.arch} (${systemInfo.osRelease})`,
  ]

  let hardware = [
    `${systemInfo.cpuModel} (${systemInfo.cpuCount} cores, ${systemInfo.cpuSpeedMHz} MHz)`,
    `${systemInfo.totalMemoryGb} GB RAM`,
  ]

  let formatList = new Intl.ListFormat('en-US', {
    type: 'conjunction',
    style: 'narrow',
  })

  return [
    'System Information:',
    '',
    `Runtime: ${formatList.format(runTime)}`,
    `Platform: ${formatList.format(platform)}`,
    `Hardware: ${formatList.format(hardware)}`,
  ].join('\n')
}

/**
 * Extracts the sample name from the full task name.
 *
 * @param {string} fullName - Full name of the benchmark task, typically in the
 *   format <testCaseName> on <sampleName>.
 * @param {string} testCaseName - Name of the test case to use for extraction.
 * @returns {string} Extracted sample name.
 */
let extractSampleName = (fullName: string, testCaseName: string): string =>
  fullName.replace(`${testCaseName} on `, '')

/**
 * Formats metrics from a benchmark result into table row values.
 *
 * @param {string} sampleName - Name of the sample (extracted from the full task
 *   name).
 * @param {ProcessedBenchmarkTask} sample - Processed benchmark task.
 * @returns {string[]} Array of formatted values for the metrics row.
 */
let formatMetricsRow = (
  sampleName: string,
  sample: ProcessedBenchmarkTask,
): string[] => [
  sampleName,
  formatHz(sample.metrics.hz),
  formatMs(sample.metrics.mean),
  formatMs(sample.metrics.median),
  formatMs(sample.metrics.min),
  formatMs(sample.metrics.max),
  formatDeviation(sample.metrics.stdDev),
]

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
    .join('-')

/**
 * Calculates uniform column widths across all tables to ensure consistency.
 *
 * @param {TestSpecResult[]} results - An array of results for all test
 *   specifications.
 * @returns {number[]} Array of column widths for the result tables.
 */
let calculateUniformColumnWidths = (results: TestSpecResult[]): number[] => {
  let columnWidths = TABLE_HEADERS.map(header => header.length)

  for (let testSpecResult of results) {
    for (let testCaseResult of testSpecResult.testCaseResults) {
      if (testCaseResult.samplesResults.length === 0) {
        for (let [i, value] of EMPTY_ROW_VALUES.entries()) {
          columnWidths[i] = Math.max(columnWidths[i]!, value.length)
        }
        continue
      }

      for (let sampleResult of testCaseResult.samplesResults) {
        let sampleName = extractSampleName(
          sampleResult.name,
          testCaseResult.name,
        )
        let rowValues = formatMetricsRow(sampleName, sampleResult)

        for (let [i, value] of rowValues.entries()) {
          columnWidths[i] = Math.max(columnWidths[i]!, value.length)
        }
      }
    }
  }

  return columnWidths.map(width => Math.max(width, MIN_COLUMN_WIDTH))
}

/**
 * Renders a table with fixed column widths for consistency across all tables.
 *
 * @param {string[][]} rows - Array of rows, where each row is an array of
 *   strings.
 * @param {number[]} fixedColumnWidths - Array of fixed column widths.
 * @param {Alignment[]} columnAlignments - Optional array of alignments for each
 *   column.
 * @returns {string} Formatted table as a string.
 */
let renderTable = (
  rows: string[][],
  fixedColumnWidths: number[],
  columnAlignments?: Alignment[],
): string => {
  let columnCount = Math.max(...rows.map(row => row.length))

  let leftPads = fixedColumnWidths.map((_, i) => (i === 0 ? 0 : CELL_PADDING))
  let rightPads = fixedColumnWidths.map((_, i) =>
    i === columnCount - 1 ? 0 : CELL_PADDING,
  )

  let separator = buildSeparator(fixedColumnWidths, leftPads, rightPads)
  let tableWidth = separator.length
  let lines: string[] = []
  let processedRows = rows

  if (processedRows[0] && processedRows[0].length === 1) {
    lines.push(
      separator,
      padCell(processedRows[0][0]!, tableWidth, 'center'),
      separator,
    )
    processedRows = processedRows.slice(1)
  }

  for (let row of processedRows) {
    let rendered = row
      .map((cell, col) => {
        let alignment = columnAlignments?.[col]
        let content = padCell(cell, fixedColumnWidths[col]!, alignment!)
        let leftSpace = ' '.repeat(leftPads[col]!)
        let rightSpace = ' '.repeat(rightPads[col]!)
        return leftSpace + content + rightSpace
      })
      .join('|')
    lines.push(rendered)
  }

  if (processedRows.length > 0) {
    lines.push(separator)
  }
  return lines.join('\n')
}

/**
 * Creates a console-friendly string representation of benchmark results.
 *
 * @param {TestSpecResult[]} results - An array of results for all test
 *   specifications.
 * @param {UserBenchmarkConfig} _userConfig - The user's benchmark configuration
 *   (currently unused).
 * @returns {Promise<string>} Formatted string for console output.
 */
export let useConsoleReport = async (
  results: TestSpecResult[],
  _userConfig?: UserBenchmarkConfig,
): Promise<string> => {
  let outputLines: string[] = []

  if (results.length === 0) {
    return 'No benchmark results available.'
  }

  let uniformColumnWidths = calculateUniformColumnWidths(results)

  for (let testSpecResult of results) {
    if (testSpecResult.testCaseResults.length === 0) {
      outputLines.push(
        '  No test cases found or all failed for this specification.',
      )
      continue
    }

    let tableRows: string[][] = [[testSpecResult.name], TABLE_HEADERS]
    let alignments = Array.from({ length: TABLE_HEADERS.length }).fill(
      'left',
    ) as Alignment[]

    for (let testCaseResult of testSpecResult.testCaseResults) {
      if (testCaseResult.samplesResults.length === 0) {
        tableRows.push(EMPTY_ROW_VALUES)
        continue
      }

      for (let sampleResult of testCaseResult.samplesResults) {
        let sampleName = extractSampleName(
          sampleResult.name,
          testCaseResult.name,
        )
        tableRows.push(formatMetricsRow(sampleName, sampleResult))
      }
    }

    outputLines.push(renderTable(tableRows, uniformColumnWidths, alignments))
  }

  let systemInfo = await collectSystemInfo()

  outputLines.unshift('')
  outputLines.push('', formatSystemInfo(systemInfo), '')

  return outputLines.join('\n')
}
