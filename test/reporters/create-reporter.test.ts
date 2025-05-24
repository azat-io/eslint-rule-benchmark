import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  TestSpecResult,
  ReporterFormat,
} from '../../types/benchmark-config'
import type { UserBenchmarkConfig } from '../../core'

import { useMarkdownReport } from '../../reporters/use-markdown-report'
import { useConsoleReport } from '../../reporters/use-console-report'
import { createReporter } from '../../reporters/create-reporter'
import { useJsonReport } from '../../reporters/use-json-report'

vi.mock('../../reporters/use-markdown-report')
vi.mock('../../reporters/use-console-report')
vi.mock('../../reporters/use-json-report')

describe('createReporter', () => {
  let mockTestSpecResults: TestSpecResult[]
  let mockUserConfig: UserBenchmarkConfig
  let mockedUseMarkdownReport = vi.mocked(useMarkdownReport)
  let mockedUseConsoleReport = vi.mocked(useConsoleReport)
  let mockedUseJsonReport = vi.mocked(useJsonReport)

  beforeEach(() => {
    vi.resetAllMocks()

    mockTestSpecResults = [
      {
        benchmarkConfig: {
          warmup: { enabled: true, iterations: 1 },
          iterations: 10,
          timeout: 1000,
        },
        name: 'Test Spec 1',
        testCaseResults: [],
        ruleId: 'rule-1',
      },
    ]
    mockUserConfig = { tests: [] }

    mockedUseMarkdownReport.mockResolvedValue('markdown report content')
    mockedUseConsoleReport.mockResolvedValue('console report content')
    mockedUseJsonReport.mockResolvedValue('json report content')
  })

  it('should call useConsoleReport and return its result when format is "console"', async () => {
    let result = await createReporter(
      mockTestSpecResults,
      mockUserConfig,
      'console',
    )
    expect(mockedUseConsoleReport).toHaveBeenCalledOnce()
    expect(mockedUseConsoleReport).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
    )
    expect(result).toBe('console report content')
    expect(mockedUseMarkdownReport).not.toHaveBeenCalled()
    expect(mockedUseJsonReport).not.toHaveBeenCalled()
  })

  it('should call useConsoleReport by default if no format is specified', async () => {
    let result = await createReporter(mockTestSpecResults, mockUserConfig)
    expect(mockedUseConsoleReport).toHaveBeenCalledOnce()
    expect(mockedUseConsoleReport).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
    )
    expect(result).toBe('console report content')
  })

  it('should call useMarkdownReport and return its result when format is "markdown"', async () => {
    let result = await createReporter(
      mockTestSpecResults,
      mockUserConfig,
      'markdown',
    )
    expect(mockedUseMarkdownReport).toHaveBeenCalledOnce()
    expect(mockedUseMarkdownReport).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
    )
    expect(result).toBe('markdown report content')
    expect(mockedUseConsoleReport).not.toHaveBeenCalled()
    expect(mockedUseJsonReport).not.toHaveBeenCalled()
  })

  it('should call useJsonReport and return its result when format is "json"', async () => {
    let result = await createReporter(
      mockTestSpecResults,
      mockUserConfig,
      'json',
    )
    expect(mockedUseJsonReport).toHaveBeenCalledOnce()
    expect(mockedUseJsonReport).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
    )
    expect(result).toBe('json report content')
    expect(mockedUseConsoleReport).not.toHaveBeenCalled()
    expect(mockedUseMarkdownReport).not.toHaveBeenCalled()
  })

  it('should throw an error for an unknown format', async () => {
    let unknownFormat = 'xml' as ReporterFormat
    await expect(() =>
      createReporter(mockTestSpecResults, mockUserConfig, unknownFormat),
    ).rejects.toThrow(/Unknown reporter format "xml"/u)
  })

  it('should list available formats in the error message for an unknown format', async () => {
    let unknownFormat = 'yaml' as ReporterFormat
    await expect(() =>
      createReporter(mockTestSpecResults, mockUserConfig, unknownFormat),
    ).rejects.toThrow(
      'Unknown reporter format "yaml". Available formats: markdown, console, and json',
    )
  })
})
