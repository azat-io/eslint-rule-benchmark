import type { JSRuleDefinitionTypeOptions, Linter } from 'eslint'

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
    let config = { iterations: 10 } as Partial<UserBenchmarkConfig>
    let errors = await validateConfig(config, '')
    expect(errors).toEqual([
      'Configuration must include at least one test in the "tests" array.',
    ])
  })

  it('should return an error if tests is empty array', async () => {
    let config = { tests: [] } as Partial<UserBenchmarkConfig>
    let errors = await validateConfig(config, '')
    expect(errors).toEqual([
      'Configuration must include at least one test in the "tests" array.',
    ])
  })

  it('should validate global iterations', async () => {
    let configInvalid: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      iterations: 0,
    }
    let errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('"iterations" must be a positive number')
  })

  it('should validate global timeout', async () => {
    let configInvalid: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      timeout: -1,
    }
    let errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('"timeout" must be a positive number')
  })

  it('should validate global warmup settings', async () => {
    let configInvalid: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      warmup: 'not-an-object' as UserBenchmarkConfig['warmup'],
    }
    let errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('"warmup" must be an object')

    configInvalid = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      warmup: {
        iterations: 'not-a-number' as unknown as number,
      },
    }
    errors = await validateConfig(configInvalid, '')
    expect(errors).toContain(
      '"warmup.iterations" must be a non-negative number',
    )

    configInvalid = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
      warmup: { enabled: 'not-a-boolean' as unknown as boolean },
    }
    errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('"warmup.enabled" must be a boolean')
  })

  it('should validate required testSpec properties', async () => {
    let config = {
      tests: [{}],
    } as Partial<UserBenchmarkConfig>
    let errors = await validateConfig(config, '')
    expect(errors).toContain('Test at index 0: "name" is required.')
    expect(errors).toContain('Test "at index 0": "ruleId" is required.')
    expect(errors).toContain('Test "at index 0": "rulePath" is required.')
    expect(errors).toContain(
      'Test "at index 0": must include at least one case in the "cases" array.',
    )
  })

  it('should validate required properties for a case in testSpec', async () => {
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [
            {} as unknown as UserBenchmarkConfig['tests'][number]['cases'][number],
          ],
          rulePath: 'rule.js',
          ruleId: 'my-rule',
          name: 'My Test',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain('Test "My Test", Case 1: "testPath" is required.')
  })

  it('should validate rule file existence for testSpec', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('File not found'))
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          rulePath: 'non-existent-rule.js',
          cases: [{ testPath: 'test.js' }],
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test "test": Rule file not found at "non-existent-rule.js".',
    )
  })

  it('should validate test file existence for string testPath in a case', async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('File not found'))
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ testPath: 'non-existent-test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test "test", Case 1: Test file/directory not found at "non-existent-test.js".',
    )
  })

  it('should validate test file existence for array testPath in a case', async () => {
    vi.mocked(fs.access)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('File not found'))
      .mockResolvedValueOnce(undefined)
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [
            { testPath: ['test1.js', 'non-existent-test.js', 'test3.js'] },
          ],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test "test", Case 1: Test file/directory not found at "non-existent-test.js".',
    )
  })

  it('should validate severity value in a case', async () => {
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ severity: 3 as Linter.Severity, testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test "test", Case 1: "severity" must be 0, 1, or 2.',
    )
  })

  it('should validate options is an array in a case', async () => {
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [
            {
              options:
                'not-an-array' as unknown as JSRuleDefinitionTypeOptions['RuleOptions'],
              testPath: 'test.js',
            },
          ],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain('Test "test", Case 1: "options" must be an array.')
  })

  it('should validate testSpec iterations, timeout, and warmup settings', async () => {
    let configInvalid: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          iterations: 0,
          name: 'test',
        },
      ],
    }
    let errors = await validateConfig(configInvalid, '')
    expect(errors).toContain(
      'Test "test": "iterations" must be a positive number',
    )

    configInvalid = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
          timeout: -1,
        },
      ],
    }
    errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('Test "test": "timeout" must be a positive number')

    configInvalid = {
      tests: [
        {
          warmup: 'not-an-object' as UserBenchmarkConfig['warmup'],
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('Test "test": "warmup" must be an object')

    configInvalid = {
      tests: [
        {
          cases: [{ testPath: 'test.js' }],
          warmup: { iterations: -1 },
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    errors = await validateConfig(configInvalid, '')
    expect(errors).toContain(
      'Test "test": "warmup.iterations" must be a non-negative number',
    )

    configInvalid = {
      tests: [
        {
          warmup: { enabled: 'false-string' as unknown as boolean },
          cases: [{ testPath: 'test.js' }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    errors = await validateConfig(configInvalid, '')
    expect(errors).toContain('Test "test": "warmup.enabled" must be a boolean')
  })

  it('should accept valid configuration without errors', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined)
    let validConfig: UserBenchmarkConfig = {
      tests: [
        {
          cases: [
            {
              options: ['option1', 'option2'],
              severity: 2 as Linter.Severity,
              testPath: 'valid-test.js',
            },
            {
              testPath: ['another-valid-test.js'],
            },
          ],
          warmup: {
            iterations: 10,
            enabled: true,
          },
          rulePath: 'valid-rule.js',
          ruleId: 'valid-rule',
          name: 'Valid Test',
          iterations: 100,
          timeout: 5000,
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

  it('should accept valid configuration with multiple test paths in a case', async () => {
    let validConfig: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [
            {
              testPath: ['test1.js', 'test2.js', 'test3.js'],
              severity: 1 as Linter.Severity,
            },
          ],
          rulePath: 'valid-rule.js',
          ruleId: 'valid-rule',
          name: 'Valid Test',
        },
      ],
    }
    let errors = await validateConfig(validConfig, '')
    expect(errors).toHaveLength(0)
  })

  it('should validate multiple testSpecs at once', async () => {
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ testPath: 'valid-test.js' }],
          rulePath: 'valid-rule.js',
          ruleId: 'valid-rule',
          name: 'Valid Test',
        },
        {
          cases: [
            {
              severity: 5 as unknown as Linter.Severity,
              testPath: 'another-test.js',
            },
          ],
          rulePath: 'another-rule.js',
        } as unknown as UserBenchmarkConfig['tests'][number],
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain('Test at index 1: "name" is required.')
    expect(errors).toContain('Test "at index 1": "ruleId" is required.')
    expect(errors).toContain(
      'Test "at index 1", Case 1: "severity" must be 0, 1, or 2.',
    )
    expect(errors).toHaveLength(3)
  })

  it('should validate testPath type in a case when it is neither string nor array', async () => {
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [{ testPath: { foo: 'bar' } as unknown as string }],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test "test", Case 1: each item in "testPath" must be a string.',
    )
  })

  it('should return an error if testPath in a case is an empty array', async () => {
    let config: Partial<UserBenchmarkConfig> = {
      tests: [
        {
          cases: [
            {
              testPath: [],
            },
          ],
          name: 'Test With Empty testPath Array',
          rulePath: 'rule.js',
          ruleId: 'my-rule',
        },
      ],
    }

    let errors = await validateConfig(config, '')
    expect(errors).toContain(
      'Test "Test With Empty testPath Array", Case 1: "testPath" array cannot be empty.',
    )
  })

  it('should pass with minimal config and no optional benchmark settings', async () => {
    let config: UserBenchmarkConfig = {
      tests: [
        {
          cases: [
            {
              testPath: 'some/path.js',
            },
          ],
          name: 'Minimal Test',
          rulePath: 'rule.js',
          ruleId: 'my-rule',
        },
      ],
    }
    let errors = await validateConfig(config, '')
    expect(
      errors.filter(
        error =>
          error.includes('iterations') ||
          error.includes('timeout') ||
          error.includes('warmup'),
      ),
    ).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })
})
