import type { PathLike, Dirent, Stats } from 'node:fs'
import type { Task } from 'tinybench'
import type { Linter } from 'eslint'

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import * as fsPromises from 'node:fs/promises'
import path from 'node:path'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'
import type { ReporterOptions } from '../../types/benchmark-config'
import type { CodeSample, TestCase } from '../../types/test-case'

import { getLanguageByFileName } from '../../core/utilities/get-language-by-file-name'
import { isSupportedExtension } from '../../core/utilities/is-supported-extension'
import { runBenchmarksFromConfig } from '../../runners/run-benchmarks-from-config'
import { getFileExtension } from '../../core/utilities/get-file-extension'
import { createTestCase } from '../../core/test-case/create-test-case'
import { runBenchmark } from '../../core/benchmark/run-benchmark'
import { runReporters } from '../../reporters'
import * as constants from '../../constants'

vi.mock('node:fs/promises')
vi.mock('../../core/utilities/get-language-by-file-name')
vi.mock('../../core/utilities/is-supported-extension')
vi.mock('../../core/utilities/get-file-extension')
vi.mock('../../core/test-case/create-test-case')
vi.mock('../../core/benchmark/run-benchmark')
vi.mock('../../reporters')

describe('runBenchmarksFromConfig', () => {
  let mockUserConfig: UserBenchmarkConfig
  let mockReporterOptions: ReporterOptions[]
  let mockCodeSamples: CodeSample[]
  let mockTestCase: TestCase
  let mockTask: Task
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let originalExitCode: undefined | number
  let configDirectory: string

  let mockedFsReadFile = vi.mocked(fsPromises.readFile)
  let mockedFsStat = vi.mocked(fsPromises.stat)
  let mockedFsReaddir = vi.mocked(fsPromises.readdir)
  let mockedGetLanguageByFileName = vi.mocked(getLanguageByFileName)
  let mockedIsSupportedExtension = vi.mocked(isSupportedExtension)
  let mockedGetFileExtension = vi.mocked(getFileExtension)
  let mockedCreateTestCase = vi.mocked(createTestCase)
  let mockedRunBenchmark = vi.mocked(runBenchmark)
  let mockedRunReporters = vi.mocked(runReporters)

  beforeEach(() => {
    vi.resetAllMocks()

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})

    originalExitCode = process.exitCode as number
    process.exitCode = undefined

    configDirectory = '/test/config/dir'

    mockCodeSamples = [
      { filename: 'sample1.js', language: 'javascript', code: 'let a = 1;' },
    ]
    mockTestCase = {
      rule: {
        severity: constants.DEFAULT_SEVERITY,
        path: 'path/to/rule.js',
        ruleId: 'test-rule',
        options: undefined,
      },
      samples: mockCodeSamples,
      name: 'Test Spec 1',
      iterationCount: 1,
      id: 'test-1',
    }
    mockTask = {
      result: {
        median: 9.5,
        samples: 5,
        p75: 10.5,
        p99: 11.5,
        stdDev: 1,
        mean: 10,
        rme: 0.1,
        hz: 100,
        max: 12,
        min: 8,
      },
      name: `${mockTestCase.name} on ${mockCodeSamples[0]!.filename}`,
      samples: [10, 9.5, 8, 12, 10.5],
    } as unknown as Task

    mockUserConfig = {
      tests: [
        {
          testPath: 'path/to/samples/sample1.js',
          rulePath: 'path/to/rule.js',
          name: 'Test Spec 1',
          ruleId: 'test-rule',
        },
      ],
      warmup: {
        iterations: constants.DEFAULT_WARMUP_ITERATIONS,
        enabled: constants.DEFAULT_WARMUP_ENABLED,
      },
      iterations: constants.DEFAULT_ITERATIONS,
      timeout: constants.DEFAULT_TIMEOUT_MS,
    }

    mockReporterOptions = [{ format: 'console' }]

    mockedIsSupportedExtension.mockReturnValue(true)
    mockedGetFileExtension.mockReturnValue('js')
    mockedGetLanguageByFileName.mockReturnValue('javascript')
    mockedFsStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
    } as Stats)
    mockedFsReadFile.mockResolvedValue('let a = 1;')
    mockedCreateTestCase.mockReturnValue(mockTestCase)
    mockedRunBenchmark.mockResolvedValue([mockTask])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.exitCode = originalExitCode
  })

  it('should correctly process a user config with one valid test spec', async () => {
    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    let expectedTestPath = mockUserConfig.tests[0]!.testPath as string
    let resolvedTestPath = path.resolve(configDirectory, expectedTestPath)

    expect(mockedFsStat).toHaveBeenCalledWith(resolvedTestPath)
    expect(mockedFsReadFile).toHaveBeenCalledWith(resolvedTestPath, 'utf8')

    expect(mockedCreateTestCase).toHaveBeenCalledOnce()
    expect(mockedCreateTestCase).toHaveBeenCalledWith({
      rule: {
        ruleId: mockUserConfig.tests[0]!.ruleId,
        path: mockUserConfig.tests[0]!.rulePath,
        severity: constants.DEFAULT_SEVERITY,
        options: undefined,
      },
      id: expect.stringContaining('config-test-Test-Spec-1-') as string,
      name: mockUserConfig.tests[0]!.name,
      samples: mockCodeSamples,
    })

    expect(mockedRunBenchmark).toHaveBeenCalledOnce()
    expect(mockedRunBenchmark).toHaveBeenCalledWith({
      config: {
        warmup: {
          iterations: mockUserConfig.warmup!.iterations,
          enabled: mockUserConfig.warmup!.enabled,
        },
        iterations: mockUserConfig.iterations,
        name: 'User Config Benchmark Run',
        timeout: mockUserConfig.timeout,
        reporters: mockReporterOptions,
      },
      testCases: [mockTestCase],
      configDirectory,
    })

    expect(mockedRunReporters).toHaveBeenCalledOnce()
    expect(mockedRunReporters).toHaveBeenCalledWith(
      {
        rule: {
          id: mockTestCase.rule.ruleId,
          path: mockTestCase.rule.path,
        },
        result: mockTask,
      },
      expect.objectContaining({ name: 'User Config Benchmark Run' }),
    )
  })

  it('should process code samples from a directory', async () => {
    mockedFsStat.mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
    } as Stats)
    mockedFsReaddir.mockResolvedValue([
      'file1.js',
      'file2.ts',
      'file3.txt',
    ] as unknown as Dirent<Buffer>[])

    mockedGetFileExtension.mockImplementation(
      filename => filename.split('.').pop()!,
    )

    mockedIsSupportedExtension.mockImplementation(
      extension => extension === 'js' || extension === 'ts',
    )

    mockedFsReadFile.mockImplementation((filePath): Promise<string> => {
      if ((filePath as PathLike).toString().includes('file1.js')) {
        return Promise.resolve('const a = 1;')
      }
      return Promise.resolve('const b: number = 2;')
    })

    mockUserConfig.tests[0]!.testPath = 'path/to/samples/'

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedFsReaddir).toHaveBeenCalledWith(
      path.resolve(configDirectory, mockUserConfig.tests[0]!.testPath),
    )
    expect(mockedFsReadFile).toHaveBeenCalledTimes(2)
    expect(mockedCreateTestCase).toHaveBeenCalledOnce()
  })

  it('should handle errors in fs.stat', async () => {
    mockedFsStat.mockRejectedValue(new Error('Stat error'))

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not process path'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
    expect(process.exitCode).toBe(1)
  })

  it('should handle non-Error objects thrown in fs.stat', async () => {
    mockedFsStat.mockRejectedValue('String error')

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not process path'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
  })

  it('should throw error when no supported files are found', async () => {
    mockedIsSupportedExtension.mockReturnValue(false)

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping test'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
    expect(process.exitCode).toBe(1)
  })

  it('should handle errors in fs.readFile', async () => {
    mockedFsReadFile.mockRejectedValue(new Error('Read error'))

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('read error'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
    expect(process.exitCode).toBe(1)
  })

  it('should handle non-Error objects thrown in fs.readFile', async () => {
    mockedFsReadFile.mockRejectedValue('String read error')

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('read error'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
  })

  it('should handle when no code samples are loaded', async () => {
    mockedFsReadFile.mockRejectedValue(new Error('Read error'))

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping test'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
  })

  it('should exit early when tests array is empty', async () => {
    mockUserConfig.tests = []

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('User configuration contains no tests'),
    )
    expect(mockedRunBenchmark).not.toHaveBeenCalled()
  })

  it('should use default values when config values are not provided', async () => {
    mockUserConfig = {
      tests: [
        {
          testPath: 'path/to/samples/sample1.js',
          rulePath: 'path/to/rule.js',
          name: 'Test Spec 1',
          ruleId: 'test-rule',
        },
      ],
    }

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedRunBenchmark).toHaveBeenCalledWith({
      config: {
        warmup: {
          iterations: constants.DEFAULT_WARMUP_ITERATIONS,
          enabled: constants.DEFAULT_WARMUP_ENABLED,
        },
        iterations: constants.DEFAULT_ITERATIONS,
        timeout: constants.DEFAULT_TIMEOUT_MS,
        name: 'User Config Benchmark Run',
        reporters: mockReporterOptions,
      },
      testCases: [mockTestCase],
      configDirectory,
    })
  })

  it('should handle errors in createTestCase', async () => {
    mockedCreateTestCase.mockImplementation(() => {
      throw new Error('Test case creation error')
    })

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping test'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
  })

  it('should handle non-Error objects thrown in createTestCase', async () => {
    mockedCreateTestCase.mockImplementation(() => {
      throw new Error('String test case error')
    })

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping test'),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No valid test cases'),
    )
  })

  it('should handle when no benchmark results are returned', async () => {
    mockedRunBenchmark.mockResolvedValue(null)

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no results were returned'),
    )
    expect(mockedRunReporters).not.toHaveBeenCalled()
  })

  it('should handle when empty benchmark results are returned', async () => {
    mockedRunBenchmark.mockResolvedValue([])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no results were returned'),
    )
    expect(mockedRunReporters).not.toHaveBeenCalled()
  })

  it('should handle multiple test cases', async () => {
    let mockTestCase2 = {
      ...mockTestCase,
      name: 'Test Spec 2',
      id: 'test-2',
    }

    mockUserConfig.tests.push({
      testPath: 'path/to/samples/sample2.js',
      rulePath: 'path/to/rule.js',
      ruleId: 'test-rule-2',
      name: 'Test Spec 2',
    })

    mockedCreateTestCase.mockImplementation(parameters => {
      if (parameters.name === 'Test Spec 1') {
        return mockTestCase
      }
      return mockTestCase2
    })

    let mockTask2 = {
      ...mockTask,
      name: `Test Spec 2 on sample2.js`,
    } as unknown as Task

    mockedRunBenchmark.mockResolvedValue([mockTask, mockTask2])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedCreateTestCase).toHaveBeenCalledTimes(2)
    expect(mockedRunReporters).toHaveBeenCalledTimes(2)
  })

  it("should handle tasks that don't match any test case name", async () => {
    let unmatchedTask = {
      ...mockTask,
      name: 'Unmatched Task',
    } as unknown as Task

    mockedRunBenchmark.mockResolvedValue([unmatchedTask])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not precisely match task'),
    )
    expect(mockedRunReporters).toHaveBeenCalledWith(
      {
        rule: {
          id: mockTestCase.rule.ruleId,
          path: mockTestCase.rule.path,
        },
        result: unmatchedTask,
      },
      expect.any(Object),
    )
  })

  it('should skip reporting for unmatched tasks when there are multiple test cases', async () => {
    let mockTestCase2 = {
      ...mockTestCase,
      name: 'Test Spec 2',
      id: 'test-2',
    }

    mockUserConfig.tests.push({
      testPath: 'path/to/samples/sample2.js',
      rulePath: 'path/to/rule.js',
      ruleId: 'test-rule-2',
      name: 'Test Spec 2',
    })

    mockedCreateTestCase.mockImplementation(parameters => {
      if (parameters.name === 'Test Spec 1') {
        return mockTestCase
      }
      return mockTestCase2
    })

    let unmatchedTask = {
      ...mockTask,
      name: 'Unmatched Task',
    } as unknown as Task

    mockedRunBenchmark.mockResolvedValue([unmatchedTask])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not find corresponding TestCase'),
    )
    expect(mockedRunReporters).not.toHaveBeenCalled()
  })

  it('should handle tasks with no name', async () => {
    let noNameTask = {
      ...mockTask,
      name: undefined,
    } as unknown as Task

    mockedRunBenchmark.mockResolvedValue([noNameTask])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not precisely match task') as string,
    )
  })

  it('should handle array of test paths', async () => {
    mockUserConfig.tests[0]!.testPath = [
      'path/to/samples/sample1.js',
      'path/to/samples/sample2.js',
    ]

    mockedFsReadFile.mockImplementation(filePath => {
      if ((filePath as PathLike).toString().includes('sample1.js')) {
        return Promise.resolve('const a = 1;')
      }
      return Promise.resolve('const b = 2;')
    })

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedFsStat).toHaveBeenCalledTimes(2)
    expect(mockedFsReadFile).toHaveBeenCalledTimes(2)
    expect(mockedCreateTestCase).toHaveBeenCalledOnce()
  })

  it('should use custom severity and options when provided', async () => {
    mockUserConfig.tests[0]!.severity = 'error' as unknown as Linter.Severity
    mockUserConfig.tests[0]!.options = { someOption: true }

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedCreateTestCase).toHaveBeenCalledWith(
      expect.objectContaining({
        rule: {
          ruleId: mockUserConfig.tests[0]!.ruleId,
          path: mockUserConfig.tests[0]!.rulePath,
          options: { someOption: true },
          severity: 'error',
        },
      }),
    )
  })
})
