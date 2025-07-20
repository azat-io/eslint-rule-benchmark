import type { PathLike, Dirent, Stats } from 'node:fs'

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import * as fsPromises from 'node:fs/promises'
import path from 'node:path'

import type {
  ReporterOptions,
  TestSpecResult,
} from '../../types/benchmark-config'
import type { ProcessedBenchmarkTask } from '../../core/benchmark/run-benchmark'
import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'
import type { CodeSample, TestCase } from '../../types/test-case'

import { getLanguageByFileName } from '../../core/utilities/get-language-by-file-name'
import { isSupportedExtension } from '../../core/utilities/is-supported-extension'
import { runBenchmarksFromConfig } from '../../runners/run-benchmarks-from-config'
import { getFileExtension } from '../../core/utilities/get-file-extension'
import { createTestCase } from '../../core/test-case/create-test-case'
import { runBenchmark } from '../../core/benchmark/run-benchmark'
import { runReporters } from '../../reporters/run-reporters'
import * as constants from '../../constants'

vi.mock('node:fs/promises')
vi.mock('../../core/utilities/get-language-by-file-name')
vi.mock('../../core/utilities/is-supported-extension')
vi.mock('../../core/utilities/get-file-extension')
vi.mock('../../core/test-case/create-test-case')
vi.mock('../../core/benchmark/run-benchmark')
vi.mock('../../reporters/run-reporters')

describe('runBenchmarksFromConfig', () => {
  let mockUserConfig: UserBenchmarkConfig
  let mockReporterOptions: ReporterOptions[]
  let mockCodeSamples: CodeSample[]
  let mockTestCase: TestCase
  let mockTask: ProcessedBenchmarkTask
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
      name: 'Test Spec 1 - Case 1',
      samples: mockCodeSamples,
      id: 'test-1-case-1',
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
    } as unknown as ProcessedBenchmarkTask

    mockUserConfig = {
      tests: [
        {
          cases: [
            {
              testPath: 'path/to/samples/sample1.js',
            },
          ],
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

    let testSpec = mockUserConfig.tests[0]!
    let caseItem = testSpec.cases[0]!
    let expectedTestPath = caseItem.testPath as string
    let resolvedTestPath = path.resolve(configDirectory, expectedTestPath)

    expect(mockedFsStat).toHaveBeenCalledWith(resolvedTestPath)
    expect(mockedFsReadFile).toHaveBeenCalledWith(resolvedTestPath, 'utf8')

    expect(mockedCreateTestCase).toHaveBeenCalledOnce()
    expect(mockedCreateTestCase).toHaveBeenCalledWith({
      rule: {
        severity: constants.DEFAULT_SEVERITY,
        ruleId: testSpec.ruleId,
        path: testSpec.rulePath,
        options: undefined,
      },
      id: expect.stringContaining(
        `config-test-${testSpec.name.replaceAll(/\s+/gu, '-')}-case-0-`,
      ) as string,
      name: `${testSpec.name} - Case 1`,
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
        timeout: mockUserConfig.timeout,
        reporters: mockReporterOptions,
        name: testSpec.name,
      },
      testCases: [mockTestCase],
      configDirectory,
    })

    expect(mockedRunReporters).toHaveBeenCalledOnce()

    let expectedTestSpecResult: TestSpecResult = {
      benchmarkConfig: {
        warmup: {
          iterations:
            mockUserConfig.warmup?.iterations ??
            constants.DEFAULT_WARMUP_ITERATIONS,
          enabled:
            mockUserConfig.warmup?.enabled ?? constants.DEFAULT_WARMUP_ENABLED,
        },
        iterations: mockUserConfig.iterations ?? constants.DEFAULT_ITERATIONS,
        timeout: mockUserConfig.timeout ?? constants.DEFAULT_TIMEOUT_MS,
      },
      testCaseResults: [
        {
          description: mockTestCase.description,
          samplesResults: [mockTask],
          name: mockTestCase.name,
          rule: mockTestCase.rule,
          id: mockTestCase.id,
        },
      ],
      rulePath: testSpec.rulePath,
      ruleId: testSpec.ruleId,
      name: testSpec.name,
    }

    expect(mockedRunReporters).toHaveBeenCalledWith(
      [expectedTestSpecResult],
      mockUserConfig,
      mockReporterOptions,
    )
  })

  it('should process code samples from a directory for a case', async () => {
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

    mockUserConfig.tests[0]!.cases[0]!.testPath = 'path/to/samples/'

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedFsReaddir).toHaveBeenCalledWith(
      path.resolve(
        configDirectory,
        mockUserConfig.tests[0]!.cases[0]!.testPath,
      ),
    )
    expect(mockedFsReadFile).toHaveBeenCalledTimes(2)
    expect(mockedCreateTestCase).toHaveBeenCalledOnce()
  })

  it('should handle errors in fs.stat when loading samples for a case', async () => {
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
      expect.stringContaining(
        `Skipping case 1 in test "${mockUserConfig.tests[0]!.name}" due to an error: No supported source files found for testPath:`,
      ),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'No valid test cases or benchmark results could be generated from the user configuration. Exiting.',
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
      expect.stringContaining('Skipping file'),
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Skipping case 1 in test "${mockUserConfig.tests[0]!.name}" due to an error: No valid code samples could be loaded from testPath:`,
      ),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'No valid test cases or benchmark results could be generated from the user configuration. Exiting.',
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
      expect.stringContaining('Skipping file'),
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Skipping case 1 in test "${mockUserConfig.tests[0]!.name}" due to an error: No valid code samples could be loaded from testPath:`,
      ),
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'No valid test cases or benchmark results could be generated from the user configuration. Exiting.',
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
          cases: [{ testPath: 'path/to/samples/sample1.js' }],
          rulePath: 'path/to/rule.js',
          name: 'Test Spec 1',
          ruleId: 'test-rule',
        },
      ],
    }
    let expectedTestCaseNameForThisTest = 'Test Spec 1 - Case 1'
    mockedCreateTestCase.mockReturnValue({
      ...mockTestCase,
      rule: {
        severity: constants.DEFAULT_SEVERITY,
        path: 'path/to/rule.js',
        ruleId: 'test-rule',
        options: undefined,
      },
      name: expectedTestCaseNameForThisTest,
      samples: mockCodeSamples,
    })

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedRunBenchmark).toHaveBeenCalledWith({
      testCases: [
        {
          ...mockTestCase,
          rule: {
            severity: constants.DEFAULT_SEVERITY,
            path: 'path/to/rule.js',
            ruleId: 'test-rule',
            options: undefined,
          },
          name: expectedTestCaseNameForThisTest,
          samples: mockCodeSamples,
        },
      ],
      config: {
        warmup: {
          iterations: constants.DEFAULT_WARMUP_ITERATIONS,
          enabled: constants.DEFAULT_WARMUP_ENABLED,
        },
        iterations: constants.DEFAULT_ITERATIONS,
        timeout: constants.DEFAULT_TIMEOUT_MS,
        reporters: mockReporterOptions,
        name: 'Test Spec 1',
      },
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
      `Skipping case 1 in test "${mockUserConfig.tests[0]!.name}" due to an error: Test case creation error`,
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'No valid test cases or benchmark results could be generated from the user configuration. Exiting.',
    )
  })

  it('should handle when empty benchmark results are returned from runBenchmark', async () => {
    mockedRunBenchmark.mockResolvedValue([])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'No valid test cases or benchmark results could be generated from the user configuration. Exiting.',
    )
    expect(mockedRunReporters).not.toHaveBeenCalled()
  })

  it('should handle multiple test cases', async () => {
    let testSpec1Case1Name = 'Test Spec 1 - Case 1'
    let testSpec2Case1Name = 'Test Spec 2 - Case 1'

    let mockTestCaseSpec1Case1: TestCase = {
      ...mockTestCase,
      rule: {
        severity: constants.DEFAULT_SEVERITY,
        path: 'path/to/rule1.js',
        ruleId: 'test-rule-1',
        options: undefined,
      },
      samples: [
        { filename: 'sample1.js', language: 'javascript', code: 'code1' },
      ],
      name: testSpec1Case1Name,
      id: 'spec1-case1',
    }
    let mockTestCaseSpec2Case1: TestCase = {
      ...mockTestCase,
      rule: {
        severity: constants.DEFAULT_SEVERITY,
        path: 'path/to/rule2.js',
        ruleId: 'test-rule-2',
        options: undefined,
      },
      samples: [
        { filename: 'sample2.js', language: 'javascript', code: 'code2' },
      ],
      name: testSpec2Case1Name,
      id: 'spec2-case1',
    }

    mockUserConfig.tests = [
      {
        cases: [{ testPath: 'path/to/samples/sample1.js' }],
        rulePath: 'path/to/rule1.js',
        ruleId: 'test-rule-1',
        name: 'Test Spec 1',
      },
      {
        cases: [{ testPath: 'path/to/samples/sample2.js' }],
        rulePath: 'path/to/rule2.js',
        ruleId: 'test-rule-2',
        name: 'Test Spec 2',
        iterations: 50,
      },
    ]

    mockedCreateTestCase.mockImplementation(parameters => {
      if (parameters.name === testSpec1Case1Name) {
        return mockTestCaseSpec1Case1
      }
      if (parameters.name === testSpec2Case1Name) {
        return mockTestCaseSpec2Case1
      }
      throw new Error(
        `Unexpected call to createTestCase with name: ${parameters.name}`,
      )
    })

    mockedFsReadFile
      .mockResolvedValueOnce('code1')
      .mockResolvedValueOnce('code2')
    mockedFsStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
    } as Stats)

    let mockTaskSpec1Case1: ProcessedBenchmarkTask = {
      ...mockTask,
      name: `${testSpec1Case1Name} on sample1.js`,
    } as unknown as ProcessedBenchmarkTask
    let mockTaskSpec2Case1: ProcessedBenchmarkTask = {
      ...mockTask,
      name: `${testSpec2Case1Name} on sample2.js`,
    } as unknown as ProcessedBenchmarkTask

    mockedRunBenchmark
      .mockResolvedValueOnce([mockTaskSpec1Case1])
      .mockResolvedValueOnce([mockTaskSpec2Case1])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedCreateTestCase).toHaveBeenCalledTimes(2)
    expect(mockedRunBenchmark).toHaveBeenCalledTimes(2)

    expect(mockedRunBenchmark).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          iterations: mockUserConfig.iterations,
          name: 'Test Spec 1',
        }) as object,
        testCases: [mockTestCaseSpec1Case1],
      }),
    )
    expect(mockedRunBenchmark).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          name: 'Test Spec 2',
          iterations: 50,
        }) as object,
        testCases: [mockTestCaseSpec2Case1],
      }),
    )

    expect(mockedRunReporters).toHaveBeenCalledOnce()

    let testSpec1 = mockUserConfig.tests[0]!
    let expectedTestSpecResult1: TestSpecResult = {
      benchmarkConfig: {
        warmup: {
          iterations:
            mockUserConfig.warmup?.iterations ??
            constants.DEFAULT_WARMUP_ITERATIONS,
          enabled:
            mockUserConfig.warmup?.enabled ?? constants.DEFAULT_WARMUP_ENABLED,
        },
        iterations: mockUserConfig.iterations ?? constants.DEFAULT_ITERATIONS,
        timeout: mockUserConfig.timeout ?? constants.DEFAULT_TIMEOUT_MS,
      },
      testCaseResults: [
        {
          description: mockTestCaseSpec1Case1.description,
          samplesResults: [mockTaskSpec1Case1],
          name: mockTestCaseSpec1Case1.name,
          rule: mockTestCaseSpec1Case1.rule,
          id: mockTestCaseSpec1Case1.id,
        },
      ],
      rulePath: testSpec1.rulePath,
      ruleId: testSpec1.ruleId,
      name: testSpec1.name,
    }

    let testSpec2 = mockUserConfig.tests[1]!
    let expectedTestSpecResult2: TestSpecResult = {
      benchmarkConfig: {
        warmup: {
          iterations:
            testSpec2.warmup?.iterations ??
            mockUserConfig.warmup?.iterations ??
            constants.DEFAULT_WARMUP_ITERATIONS,
          enabled:
            testSpec2.warmup?.enabled ??
            mockUserConfig.warmup?.enabled ??
            constants.DEFAULT_WARMUP_ENABLED,
        },
        iterations: testSpec2.iterations ?? constants.DEFAULT_ITERATIONS,
        timeout: mockUserConfig.timeout ?? constants.DEFAULT_TIMEOUT_MS,
      },
      testCaseResults: [
        {
          description: mockTestCaseSpec2Case1.description,
          samplesResults: [mockTaskSpec2Case1],
          name: mockTestCaseSpec2Case1.name,
          rule: mockTestCaseSpec2Case1.rule,
          id: mockTestCaseSpec2Case1.id,
        },
      ],
      rulePath: testSpec2.rulePath,
      ruleId: testSpec2.ruleId,
      name: testSpec2.name,
    }

    expect(mockedRunReporters).toHaveBeenCalledWith(
      [expectedTestSpecResult1, expectedTestSpecResult2],
      mockUserConfig,
      mockReporterOptions,
    )
  })
  it('should handle tasks with no name (empty string name)', async () => {
    mockUserConfig.tests = [
      {
        cases: [{ testPath: 'path/to/samples/sample-no-name.js' }],
        rulePath: 'path/to/rule-no-name.js',
        name: 'Test Spec No Name Task',
        ruleId: 'test-rule-no-name',
      },
    ]
    let noNameTestCaseName = 'Test Spec No Name Task - Case 1'
    let mockNoNameTestCase: TestCase = {
      ...mockTestCase,
      rule: {
        severity: constants.DEFAULT_SEVERITY,
        path: 'path/to/rule-no-name.js',
        ruleId: 'test-rule-no-name',
        options: undefined,
      },
      samples: [
        {
          filename: 'sample-no-name.js',
          language: 'javascript',
          code: 'no_name_code',
        },
      ],
      name: noNameTestCaseName,
      id: 'no-name-task-case1',
    }
    mockedCreateTestCase.mockReturnValue(mockNoNameTestCase)
    mockedFsReadFile.mockResolvedValue('no_name_code')
    mockedFsStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
    } as Stats)

    let noNameTask = {
      ...mockTask,
      name: '',
    } as unknown as ProcessedBenchmarkTask
    mockedRunBenchmark.mockResolvedValue([noNameTask])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    mockedCreateTestCase.mockReturnValue({
      ...mockNoNameTestCase,
      samples: [
        {
          filename: 'sample-no-name.js',
          language: 'javascript',
          code: 'no_name_code',
        },
      ],
    })
    mockedRunBenchmark.mockResolvedValue([noNameTask])

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'No valid test cases or benchmark results could be generated from the user configuration. Exiting.',
    )
    expect(mockedRunReporters).not.toHaveBeenCalled()
  })

  it('should handle array of test paths for a case', async () => {
    mockUserConfig.tests[0]!.cases[0]!.testPath = [
      'path/to/samples/sample1.js',
      'path/to/samples/sample2.js',
    ]

    mockedFsReadFile.mockImplementation(filePath => {
      if ((filePath as PathLike).toString().includes('sample1.js')) {
        return Promise.resolve('const a = 1;')
      }
      return Promise.resolve('const b = 2;')
    })

    mockedCreateTestCase.mockImplementation(parameters => ({
      ...mockTestCase,
      samples: [
        {
          filename: 'sample1.js',
          language: 'javascript',
          code: 'const a = 1;',
        },
        {
          filename: 'sample2.js',
          language: 'javascript',
          code: 'const b = 2;',
        },
      ],
      name: parameters.name,
      rule: parameters.rule,
      id: parameters.id,
    }))

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedFsStat).toHaveBeenCalledTimes(2)
    expect(mockedFsReadFile).toHaveBeenCalledTimes(2)
    expect(mockedCreateTestCase).toHaveBeenCalledOnce()
  })

  it('should use custom severity and options for a case when provided', async () => {
    mockUserConfig.tests[0]!.cases[0]!.severity = 2
    mockUserConfig.tests[0]!.cases[0]!.options = [{ someOption: true }]

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
          options: [{ someOption: true }],
          severity: 2,
        },
      }),
    )
  })

  it('should use test spec specific warmup values when provided', async () => {
    mockUserConfig = {
      tests: [
        {
          warmup: {
            iterations: 10,
            enabled: false,
          },
          cases: [{ testPath: 'path/to/samples/sample1.js' }],
          rulePath: 'path/to/rule.js',
          name: 'Test Spec 1',
          ruleId: 'test-rule',
        },
      ],
      warmup: {
        iterations: 20,
        enabled: true,
      },
      iterations: constants.DEFAULT_ITERATIONS,
      timeout: constants.DEFAULT_TIMEOUT_MS,
    }

    await runBenchmarksFromConfig({
      reporterOptions: mockReporterOptions,
      userConfig: mockUserConfig,
      configDirectory,
    })

    expect(mockedRunBenchmark).toHaveBeenCalledWith({
      config: expect.objectContaining({
        warmup: {
          iterations: 10,
          enabled: false,
        },
        name: 'Test Spec 1',
      }) as object,
      testCases: expect.any(Array) as unknown as TestCase[],
      configDirectory,
    })
  })
})
