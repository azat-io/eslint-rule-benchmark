import type { Jiti } from 'jiti'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadLanguageParser } from '../../../core/eslint/load-language-parser'

interface WithParseForESLintMethod {
  parseForESLint(): object
}

interface WithParseMethod {
  parse(): object
}

function createMockJiti(): Jiti {
  return {
    import: vi.fn(),
  } as unknown as Jiti
}

describe('loadLanguageParser', () => {
  let mockJiti: Jiti

  beforeEach(() => {
    mockJiti = createMockJiti()
  })

  it('returns null parser for JavaScript (no parser needed)', async () => {
    let result = await loadLanguageParser(mockJiti, 'javascript')

    expect(vi.mocked(mockJiti.import)).not.toHaveBeenCalled()
    expect(result.parser).toBeNull()
    expect(result.error).toBeUndefined()
  })

  it('returns null parser for JavaScript-React (no parser needed)', async () => {
    let result = await loadLanguageParser(mockJiti, 'javascript-react')

    expect(vi.mocked(mockJiti.import)).not.toHaveBeenCalled()
    expect(result.parser).toBeNull()
    expect(result.error).toBeUndefined()
  })

  it('loads TypeScript parser with parse method successfully', async () => {
    let mockParser: WithParseMethod = {
      parse: () => ({}),
    }

    vi.mocked(mockJiti.import).mockResolvedValueOnce(mockParser)

    let result = await loadLanguageParser(mockJiti, 'typescript')

    expect(vi.mocked(mockJiti.import)).toHaveBeenCalledWith(
      '@typescript-eslint/parser',
    )
    expect(result.parser).toBeDefined()
    expect('parse' in result.parser!).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('loads parser with parseForESLint method successfully', async () => {
    let mockParser: WithParseForESLintMethod = {
      parseForESLint: () => ({}),
    }

    vi.mocked(mockJiti.import).mockResolvedValueOnce(mockParser)

    let result = await loadLanguageParser(mockJiti, 'typescript')

    expect(vi.mocked(mockJiti.import)).toHaveBeenCalledWith(
      '@typescript-eslint/parser',
    )
    expect(result.parser).toBeDefined()
    expect('parseForESLint' in result.parser!).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('extracts parser with parse method from default export', async () => {
    let mockModule = {
      default: {
        parse: () => ({}),
      } as WithParseMethod,
    }

    vi.mocked(mockJiti.import).mockResolvedValueOnce(mockModule)

    let result = await loadLanguageParser(mockJiti, 'typescript')

    expect(result.parser).toBeDefined()
    expect('parse' in result.parser!).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('extracts parser with parseForESLint method from default export', async () => {
    let mockModule = {
      default: {
        parseForESLint: () => ({}),
      } as WithParseForESLintMethod,
    }

    vi.mocked(mockJiti.import).mockResolvedValueOnce(mockModule)

    let result = await loadLanguageParser(mockJiti, 'typescript')

    expect(result.parser).toBeDefined()
    expect('parseForESLint' in result.parser!).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('handles missing parser in module', async () => {
    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      someOtherProperty: true,
    })

    let result = await loadLanguageParser(mockJiti, 'typescript')

    expect(result.parser).toBeUndefined()
    expect(result.error).toMatch(/Parser not found in module/u)
  })

  it('catches and reports import errors', async () => {
    let errorMessage = 'Parser package not found'

    vi.mocked(mockJiti.import).mockImplementationOnce(() => {
      throw new Error(errorMessage)
    })

    let result = await loadLanguageParser(mockJiti, 'typescript')

    expect(result.parser).toBeUndefined()
    expect(result.error).toBe(errorMessage)
  })

  it('handles both parse and parseForESLint parser formats', async () => {
    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      parse: () => ({}),
    })

    let result1 = await loadLanguageParser(mockJiti, 'typescript')
    expect(result1.parser).toBeDefined()
    expect('parse' in result1.parser!).toBeTruthy()

    vi.mocked(mockJiti.import).mockResolvedValueOnce({
      parseForESLint: () => ({}),
    })

    let result2 = await loadLanguageParser(mockJiti, 'svelte')
    expect(result2.parser).toBeDefined()
    expect('parseForESLint' in result2.parser!).toBeTruthy()
  })
})
