import type { Loader } from 'lilconfig'
import type { Jiti } from 'jiti'

import { beforeEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createJiti } from 'jiti'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

interface JitiMock extends Jiti {
  __importMock__: ReturnType<typeof vi.fn>
}

vi.mock('jiti', () => {
  let importMock = vi.fn()
  let createJitiMock = vi.fn(() => ({ import: importMock }))

  ;(createJitiMock as unknown as JitiMock).__importMock__ = importMock

  return { createJiti: createJitiMock }
})

let importMock: ReturnType<typeof vi.fn>
let jitiLoader: Loader

describe('jitiLoader', () => {
  beforeAll(async () => {
    ;({ jitiLoader } = await import('../../core/config/jiti-loader'))

    importMock = (createJiti as JitiMock).__importMock__
  })

  beforeEach(() => {
    importMock.mockReset()
  })

  it('successfully loads and returns config', async () => {
    let cfg: UserBenchmarkConfig = {
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'demo',
        },
      ],
    }

    importMock.mockResolvedValueOnce({ default: cfg })

    let result = (await jitiLoader('/conf.ts', '')) as UserBenchmarkConfig

    expect(importMock).toHaveBeenCalledWith('/conf.ts')
    expect(result).toEqual(cfg)
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
