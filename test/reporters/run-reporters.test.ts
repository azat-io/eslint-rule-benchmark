import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fsPromises from 'node:fs/promises'
import path from 'node:path'

import type {
  ReporterOptions,
  TestSpecResult,
} from '../../types/benchmark-config'
import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

import { createReporter } from '../../reporters/create-reporter'
import { runReporters } from '../../reporters/run-reporters'

vi.mock('node:fs/promises')
vi.mock('../../reporters/create-reporter')

describe('runReporters', () => {
  let mockTestSpecResults: TestSpecResult[]
  let mockUserConfig: UserBenchmarkConfig
  let mockReporterOptions: ReporterOptions[]
  let mockedCreateReporter = vi.mocked(createReporter)
  let mockedFsWriteFile = vi.mocked(fsPromises.writeFile)
  let mockedFsMkdir = vi.mocked(fsPromises.mkdir)
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetAllMocks()

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    mockTestSpecResults = [
      {
        benchmarkConfig: {
          warmup: { enabled: false, iterations: 0 },
          iterations: 1,
          timeout: 100,
        },
        testCaseResults: [],
        ruleId: 'rule1',
        name: 'Spec1',
      },
    ]
    mockUserConfig = { tests: [] }
    mockedCreateReporter.mockResolvedValue('mocked report content')
  })

  it('should call createReporter and save to file if outputPath is provided', async () => {
    mockReporterOptions = [
      { outputPath: 'output/report.md', format: 'markdown' },
    ]
    await runReporters(mockTestSpecResults, mockUserConfig, mockReporterOptions)

    expect(mockedCreateReporter).toHaveBeenCalledOnce()
    expect(mockedCreateReporter).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
      'markdown',
    )
    expect(mockedFsMkdir).toHaveBeenCalledOnce()
    expect(mockedFsMkdir).toHaveBeenCalledWith(path.resolve('output'), {
      recursive: true,
    })
    expect(mockedFsWriteFile).toHaveBeenCalledOnce()
    expect(mockedFsWriteFile).toHaveBeenCalledWith(
      path.resolve('output/report.md'),
      'mocked report content',
      'utf8',
    )
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Report in "markdown" format saved to:'),
    )
    expect(consoleLogSpy).not.toHaveBeenCalled()
  })

  it('should call createReporter for each reporter option', async () => {
    mockReporterOptions = [
      { outputPath: 'out/report.json', format: 'json' },
      { outputPath: 'out/report.md', format: 'markdown' },
    ]
    await runReporters(mockTestSpecResults, mockUserConfig, mockReporterOptions)

    expect(mockedCreateReporter).toHaveBeenCalledTimes(2)
    expect(mockedCreateReporter).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
      'json',
    )
    expect(mockedCreateReporter).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
      'markdown',
    )
    expect(mockedFsWriteFile).toHaveBeenCalledTimes(2)
  })

  it('should warn and not call createReporter if reporterOptions is empty', async () => {
    mockReporterOptions = []
    await runReporters(mockTestSpecResults, mockUserConfig, mockReporterOptions)

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'No reporters configured. Skipping report generation.',
    )
    expect(mockedCreateReporter).not.toHaveBeenCalled()
  })

  it('should log error if createReporter throws', async () => {
    mockReporterOptions = [{ format: 'console' }]
    mockedCreateReporter.mockImplementation(() => {
      throw new Error('Create reporter error')
    })

    await runReporters(mockTestSpecResults, mockUserConfig, mockReporterOptions)

    expect(consoleErrorSpy).toHaveBeenCalledOnce()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error generating report for format "console": Create reporter error',
      ),
      expect.any(String),
    )
  })

  it('should log error if fs.writeFile throws', async () => {
    mockReporterOptions = [{ outputPath: 'out/report.md', format: 'markdown' }]
    mockedFsWriteFile.mockRejectedValue(new Error('File system error'))

    await runReporters(mockTestSpecResults, mockUserConfig, mockReporterOptions)

    expect(consoleErrorSpy).toHaveBeenCalledOnce()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error generating report for format "markdown": File system error',
      ),
      expect.any(String),
    )
  })

  it('should output to console.info when format is console and no outputPath', async () => {
    mockReporterOptions = [{ format: 'console' }]
    mockedCreateReporter.mockResolvedValue('Console report content')

    await runReporters(mockTestSpecResults, mockUserConfig, mockReporterOptions)

    expect(mockedCreateReporter).toHaveBeenCalledOnce()
    expect(mockedCreateReporter).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
      'console',
    )
    expect(consoleInfoSpy).toHaveBeenCalledOnce()
    expect(consoleInfoSpy).toHaveBeenCalledWith('Console report content')
    expect(mockedFsWriteFile).not.toHaveBeenCalled()
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it('should output to console.warn when format is not console and no outputPath', async () => {
    mockReporterOptions = [{ format: 'markdown' }]
    mockedCreateReporter.mockResolvedValue('Markdown report content')

    await runReporters(mockTestSpecResults, mockUserConfig, mockReporterOptions)

    expect(mockedCreateReporter).toHaveBeenCalledOnce()
    expect(mockedCreateReporter).toHaveBeenCalledWith(
      mockTestSpecResults,
      mockUserConfig,
      'markdown',
    )
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Report content for format "markdown" (no outputPath specified):\n',
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith('Markdown report content')
    expect(mockedFsWriteFile).not.toHaveBeenCalled()
    expect(consoleInfoSpy).not.toHaveBeenCalled()
  })
})
