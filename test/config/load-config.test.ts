import type { Mock } from 'vitest'
import type { Jiti } from 'jiti'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lilconfig } from 'lilconfig'
import { createJiti } from 'jiti'

import { loadConfig } from '../../core/config/load-config'

interface SearchFunction extends Mock {
  (searchFrom?: string): Promise<{
    filepath: string
    config: unknown
  } | null>
}

vi.mock('lilconfig', () => {
  let search = vi.fn()
  return {
    lilconfig: vi.fn(() => ({ search })),
  }
})

vi.mock('jiti', () => ({
  createJiti: vi.fn().mockReturnValue({
    import: vi.fn(),
  }),
}))

let jitiImportMock = vi.fn()
let originalJsonParse = JSON.parse

describe('loadConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    vi.mocked(createJiti).mockReturnValue({
      import: jitiImportMock,
    } as unknown as Jiti)
    globalThis.JSON.parse = originalJsonParse
  })

  it('should load configuration from default directory', async () => {
    ;(
      vi.mocked(lilconfig)('eslint-rule-benchmark').search as SearchFunction
    ).mockResolvedValue({
      config: {
        tests: [
          {
            rulePath: 'rule.js',
            testPath: 'test.js',
            ruleId: 'rule',
            name: 'test',
          },
        ],
      },
      filepath: '/path/to/config.js',
    })

    let config = await loadConfig()

    expect(
      vi.mocked(vi.mocked(lilconfig)('eslint-rule-benchmark'))
        .search as SearchFunction,
    ).toHaveBeenCalledWith(process.cwd())
    expect(config).toEqual({
      config: {
        tests: [
          {
            rulePath: 'rule.js',
            testPath: 'test.js',
            ruleId: 'rule',
            name: 'test',
          },
        ],
      },
      filepath: '/path/to/config.js',
    })
  })

  it('should load configuration from specified directory', async () => {
    ;(
      vi.mocked(lilconfig)('eslint-rule-benchmark').search as SearchFunction
    ).mockResolvedValue({
      config: {
        tests: [
          {
            rulePath: 'custom-rule.js',
            testPath: 'custom-test.js',
            ruleId: 'custom-rule',
            name: 'custom',
          },
        ],
      },
      filepath: '/custom/path/config.js',
    })

    let customPath = '/custom/path'
    let config = await loadConfig(customPath)

    expect(
      vi.mocked(lilconfig)('eslint-rule-benchmark').search as SearchFunction,
    ).toHaveBeenCalledWith(customPath)
    expect(config).toEqual({
      config: {
        tests: [
          {
            rulePath: 'custom-rule.js',
            testPath: 'custom-test.js',
            ruleId: 'custom-rule',
            name: 'custom',
          },
        ],
      },
      filepath: '/custom/path/config.js',
    })
  })

  it('should throw error when no configuration found', async () => {
    ;(
      vi.mocked(lilconfig)('eslint-rule-benchmark').search as SearchFunction
    ).mockResolvedValue(null)

    await expect(loadConfig()).rejects.toThrow(
      `No config found in: ${process.cwd()}`,
    )
  })

  it('should handle errors when loading configuration files with .ts extension', async () => {
    ;(
      vi.mocked(lilconfig)('eslint-rule-benchmark').search as SearchFunction
    ).mockRejectedValue(
      new Error(
        'Error loading file: /path/to/config.ts\nError: Test import error',
      ),
    )

    await expect(loadConfig()).rejects.toThrow(
      'Error loading file: /path/to/config.ts\nError: Test import error',
    )
  })

  it('should handle TypeScript configuration files', async () => {
    let tsConfig = {
      config: {
        tests: [
          {
            rulePath: 'rule.ts',
            testPath: 'test.ts',
            name: 'ts-test',
            ruleId: 'rule',
          },
        ],
      },
      filepath: '/path/to/config.ts',
    }
    ;(
      vi.mocked(lilconfig)('eslint-rule-benchmark').search as SearchFunction
    ).mockResolvedValue({
      filepath: '/path/to/config.ts',
      config: tsConfig.config,
    })

    let config = await loadConfig()
    expect(config).toEqual(tsConfig)
  })

  it('should handle errors when loading configuration files with .json extension', async () => {
    ;(
      vi.mocked(lilconfig)('eslint-rule-benchmark').search as SearchFunction
    ).mockRejectedValue(new Error('Failed to load JSON: Invalid JSON'))

    await expect(loadConfig()).rejects.toThrow(
      'Failed to load JSON: Invalid JSON',
    )
  })
})
