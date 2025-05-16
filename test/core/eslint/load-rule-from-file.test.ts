import type { Jiti } from 'jiti'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'node:path'

import { loadRuleFromFile } from '../../../core/eslint/load-rule-from-file'

let createMockJiti = (): Jiti =>
  ({
    import: vi.fn(),
  }) as unknown as Jiti

describe('loadRuleFromFile', () => {
  let mockJiti: Jiti

  beforeEach(() => {
    mockJiti = createMockJiti()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock-cwd')
  })

  it('loads direct rule export', async () => {
    let directRule = {
      meta: { type: 'problem' },
      create: () => ({}),
    }

    vi.mocked(mockJiti.import).mockResolvedValueOnce(directRule)

    let result = await loadRuleFromFile(
      mockJiti,
      '/path/to/rule.js',
      'direct-rule',
    )

    expect(result.rule).toBe(directRule)
    expect(result.error).toBeUndefined()
  })

  it('loads rule from rules collection', async () => {
    let ruleId = 'collection-rule'
    let ruleModule = { meta: { type: 'problem' }, create: () => ({}) }

    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      rules: {
        [ruleId]: ruleModule,
      },
    })

    let result = await loadRuleFromFile(mockJiti, '/path/to/rules.js', ruleId)

    expect(result.rule).toBe(ruleModule)
    expect(result.error).toBeUndefined()
  })

  it('loads rule from default export (direct rule)', async () => {
    let ruleModule = { meta: { type: 'problem' }, create: () => ({}) }

    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      default: ruleModule,
    })

    let result = await loadRuleFromFile(
      mockJiti,
      '/path/to/default-rule.js',
      'any-id',
    )

    expect(result.rule).toBe(ruleModule)
    expect(result.error).toBeUndefined()
  })

  it('loads rule from default export (rules collection)', async () => {
    let ruleId = 'default-collection-rule'
    let ruleModule = { meta: { type: 'problem' }, create: () => ({}) }

    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      default: {
        rules: {
          [ruleId]: ruleModule,
        },
      },
    })

    let result = await loadRuleFromFile(
      mockJiti,
      '/path/to/default-collection.js',
      ruleId,
    )

    expect(result.rule).toBe(ruleModule)
    expect(result.error).toBeUndefined()
  })

  it('resolves relative paths to absolute', async () => {
    let relativePath = 'relative/path/to/rule.js'
    let expectedAbsolutePath = path.resolve('/mock-cwd', relativePath)

    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      meta: { type: 'problem' },
      create: () => ({}),
    })

    await loadRuleFromFile(mockJiti, relativePath, 'any-id')

    expect(mockJiti.import).toHaveBeenCalledWith(expectedAbsolutePath)
  })

  it('handles already absolute paths', async () => {
    let absolutePath = '/absolute/path/to/rule.js'

    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      meta: { type: 'problem' },
      create: () => ({}),
    })

    await loadRuleFromFile(mockJiti, absolutePath, 'any-id')

    expect(mockJiti.import).toHaveBeenCalledWith(absolutePath)
  })

  it('returns undefined rule when not found in module', async () => {
    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      rules: {
        'some-other-rule': { create: () => ({}), meta: {} },
      },
    })

    let result = await loadRuleFromFile(
      mockJiti,
      '/path/to/rules.js',
      'non-existent-rule',
    )

    expect(result.rule).toBeUndefined()
    expect(result.error).toBeUndefined()
  })

  it('returns undefined when module has no valid rule format', async () => {
    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      someOtherProperty: true,
    })

    let result = await loadRuleFromFile(
      mockJiti,
      '/path/to/invalid.js',
      'any-id',
    )

    expect(result.rule).toBeUndefined()
    expect(result.error).toBeUndefined()
  })

  it('catches and reports import errors', async () => {
    let errorMessage = 'Module not found'

    vi.mocked(mockJiti.import).mockImplementationOnce(() => {
      throw new Error(errorMessage)
    })

    let result = await loadRuleFromFile(
      mockJiti,
      '/path/to/missing.js',
      'any-id',
    )

    expect(result.rule).toBeUndefined()
    expect(result.error).toBe(errorMessage)
  })
})
