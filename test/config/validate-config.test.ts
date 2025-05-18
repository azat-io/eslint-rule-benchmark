import type { Linter } from 'eslint'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { UserBenchmarkConfig } from '../../core'

import { validateConfig } from '../../core/config/validate-config'

vi.mock('node:fs/promises', () => {
  let access = vi.fn().mockResolvedValue(undefined)
  return {
    default: { access },
    access,
  }
})

vi.mock('node:path', () => {
  let resolve = vi.fn((_cwd: string, fp: string) => `/mocked/path/${fp}`)
  return {
    default: { resolve },
    resolve,
  }
})

describe('validateConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fs.access).mockResolvedValue(undefined)

    vi.mocked(path.resolve).mockImplementation(
      (_cwd, fp) => `/mocked/path/${fp}`,
    )
  })

  it('should return an error if no tests are provided', async () => {
    let config = { iterations: 10 }
    let errors = await validateConfig(config, '')
    expect(errors).toEqual([
      'Configuration must include at least one test in the "tests" array',
    ])
  })

  it('should return an error if tests is empty array', async () => {
    let config = { tests: [] }
    let errors = await validateConfig(config, '')
    expect(errors).toEqual([
      'Configuration must include at least one test in the "tests" array',
    ])
  })

  it('should validate global iterations', async () => {
    let configInvalid = {
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      iterations: 0,
    }
    let errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('Global "iterations" must be a positive number')
  })

  it('should validate global timeout', async () => {
    let configInvalid = {
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      timeout: -1,
    }
    let errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('Global "timeout" must be a positive number')
  })

  it('should validate global warmup settings', async () => {
    let configInvalid = {
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      warmup: 'not-an-object',
    }
    let errors = await validateConfig(configInvalid as UserBenchmarkConfig, '')
    expect(errors).toContain('Global "warmup" must be an object')

    let configInvalidIterations = {
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      warmup: { iterations: 'not-a-number' },
    }
    let errorsIterations = await validateConfig(
      configInvalidIterations as unknown as UserBenchmarkConfig,
      '',
    )
    expect(errorsIterations).toContain(
      'Global "warmup.iterations" must be a non-negative number',
    )

    let configInvalidEnabled = {
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      warmup: { enabled: 'not-a-boolean' },
    }
    let errorsEnabled = await validateConfig(
      configInvalidEnabled as unknown as UserBenchmarkConfig,
      '',
    )
    expect(errorsEnabled).toContain('Global "warmup.enabled" must be a boolean')
  })

  it('should validate required test properties', async () => {
    let config = {
      tests: [{}],
    }
    let errors = await validateConfig(config as UserBenchmarkConfig, '')
    expect(errors).toContain('Test at index 0: "name" is required')
    expect(errors).toContain('Test at index 0: "ruleId" is required')
    expect(errors).toContain('Test at index 0: "rulePath" is required')
    expect(errors).toContain('Test at index 0: "testPath" is required')
  })

  it('should validate rule file existence', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('File not found'))

    let config = {
      tests: [
        {
          rulePath: 'non-existent-rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test at index 0: Rule file not found at "non-existent-rule.js"',
    )
  })

  it('should validate test file existence for string testPath', async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('File not found'))

    let config = {
      tests: [
        {
          testPath: 'non-existent-test.js',
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test at index 0: Test file not found at "non-existent-test.js"',
    )
  })

  it('should validate test file existence for array testPath', async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('File not found'))
      .mockResolvedValueOnce(undefined)

    let config = {
      tests: [
        {
          testPath: ['test1.js', 'non-existent-test.js', 'test3.js'],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test at index 0: Test file not found at "non-existent-test.js"',
    )
  })

  it('should validate test severity value', async () => {
    let config = {
      tests: [
        {
          severity: 3 as Linter.Severity,
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errors = await validateConfig(config, '')
    expect(errors).toContain('Test at index 0: "severity" must be 0, 1, or 2')
  })

  it('should validate test options is an array', async () => {
    let config = {
      tests: [
        {
          options: 'not-an-array',
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errors = await validateConfig(config as UserBenchmarkConfig, '')
    expect(errors).toContain('Test at index 0: "options" must be an array')
  })

  it('should validate benchmarkSettings structure', async () => {
    let configInvalidType = {
      tests: [
        {
          benchmarkSettings: 'not-an-object',
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errorsType = await validateConfig(
      configInvalidType as unknown as UserBenchmarkConfig,
      '',
    )
    expect(errorsType).toContain(
      'Test at index 0: "benchmarkSettings" must be an object',
    )

    let configInvalidIterations = {
      tests: [
        {
          benchmarkSettings: {
            iterations: 0,
          },
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errorsIterations = await validateConfig(configInvalidIterations, '')
    expect(errorsIterations).toContain(
      'Test at index 0: "benchmarkSettings.iterations" must be a positive number',
    )

    let configInvalidTimeout = {
      tests: [
        {
          benchmarkSettings: {
            timeout: -1,
          },
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errorsTimeout = await validateConfig(configInvalidTimeout, '')
    expect(errorsTimeout).toContain(
      'Test at index 0: "benchmarkSettings.timeout" must be a positive number',
    )
  })

  it('should validate benchmarkSettings.warmup structure', async () => {
    let configInvalidType = {
      tests: [
        {
          benchmarkSettings: {
            warmup: 'not-an-object',
          },
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errorsType = await validateConfig(
      configInvalidType as UserBenchmarkConfig,
      '',
    )
    expect(errorsType).toContain(
      'Test at index 0: "benchmarkSettings.warmup" must be an object',
    )

    let configInvalidIterations = {
      tests: [
        {
          benchmarkSettings: {
            warmup: {
              iterations: -1,
            },
          },
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errorsIterations = await validateConfig(configInvalidIterations, '')
    expect(errorsIterations).toContain(
      'Test at index 0: "benchmarkSettings.warmup.iterations" must be a non-negative number',
    )

    let configInvalidEnabled = {
      tests: [
        {
          benchmarkSettings: {
            warmup: {
              enabled: 'not-a-boolean',
            },
          },
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errorsEnabled = await validateConfig(
      configInvalidEnabled as unknown as UserBenchmarkConfig,
      '',
    )
    expect(errorsEnabled).toContain(
      'Test at index 0: "benchmarkSettings.warmup.enabled" must be a boolean',
    )
  })

  it('should accept valid configuration without errors', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined)

    let validConfig = {
      tests: [
        {
          benchmarkSettings: {
            warmup: {
              iterations: 10,
              enabled: true,
            },
            iterations: 100,
            timeout: 5000,
          },
          options: ['option1', 'option2'],
          severity: 2 as Linter.Severity,
          rulePath: 'valid-rule.js',
          testPath: 'valid-test.js',
          ruleId: 'valid-rule',
          name: 'Valid Test',
        },
      ],
      warmup: {
        iterations: 5,
        enabled: true,
      },
      iterations: 50,
      timeout: 10000,
    }

    let errors = await validateConfig(validConfig, '')
    expect(errors).toHaveLength(0)
  })

  it('should accept valid configuration with multiple test paths', async () => {
    let validConfig = {
      tests: [
        {
          testPath: ['test1.js', 'test2.js', 'test3.js'],
          severity: 1 as Linter.Severity,
          rulePath: 'valid-rule.js',
          ruleId: 'valid-rule',
          name: 'Valid Test',
        },
      ],
    }

    let errors = await validateConfig(validConfig, '')
    expect(errors).toHaveLength(0)
  })

  it('should validate multiple tests at once', async () => {
    let config = {
      tests: [
        {
          rulePath: 'valid-rule.js',
          testPath: 'valid-test.js',
          ruleId: 'valid-rule',
          name: 'Valid Test',
        },
        {
          rulePath: 'another-rule.js',
          testPath: 'another-test.js',
          severity: 5,
        },
      ],
    }

    let errors = await validateConfig(config as UserBenchmarkConfig, '')
    expect(errors).toContain('Test at index 1: "name" is required')
    expect(errors).toContain('Test at index 1: "ruleId" is required')
    expect(errors).toContain('Test at index 1: "severity" must be 0, 1, or 2')
    expect(errors).toHaveLength(3)
  })

  it('should validate testPath type when it is neither string nor array', async () => {
    let config = {
      tests: [
        {
          testPath: { foo: 'bar' },
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }

    let errors = await validateConfig(
      config as unknown as UserBenchmarkConfig,
      '',
    )

    expect(errors).toContain(
      'Test at index 0: "testPath" must be a string or an array of strings',
    )
  })
})
