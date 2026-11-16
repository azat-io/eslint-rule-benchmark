import type { Loader } from 'lilconfig'

import { beforeEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

let { importMock } = vi.hoisted(() => ({ importMock: vi.fn() }))

vi.mock('jiti', () => ({
  createJiti: vi.fn(() => ({ import: importMock })),
}))

let jitiLoader: Loader

describe('jitiLoader', () => {
  beforeAll(async () => {
    ;({ jitiLoader } = await import('../../core/config/jiti-loader'))
  })

  beforeEach(() => {
    importMock.mockReset()
  })

  it('successfully loads and returns config', async () => {
    let config: UserBenchmarkConfig = {
      tests: [
        {
          cases: [
            {
              testPath: 'test.js',
            },
          ],
          rulePath: 'rule.js',
          ruleId: 'rule',
          name: 'demo',
        },
      ],
    }

    importMock.mockResolvedValueOnce({ default: config })

    let result = (await jitiLoader('/conf.ts', '')) as UserBenchmarkConfig

    expect(importMock).toHaveBeenCalledWith('/conf.ts')
    expect(result).toEqual(config)
  })

  it('wraps import error in a descriptive message', async () => {
    importMock.mockRejectedValueOnce(new Error('syntax error'))

    await expect(jitiLoader('/bad.ts', '')).rejects.toThrow(
      'Error loading file /bad.ts',
    )
  })

  it('proxies any path it was given', async () => {
    importMock.mockResolvedValue({ default: { tests: [] } })

    await jitiLoader('/a.js', '')
    expect(importMock).toHaveBeenCalledWith('/a.js')

    importMock.mockClear()

    await jitiLoader('./b.mts', '')
    expect(importMock).toHaveBeenCalledWith('./b.mts')
  })
})
