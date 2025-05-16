import { describe, expect, it } from 'vitest'

import { getLanguageByFileName } from '../../../core/utilities/get-language-by-file-name'

describe('getLanguageByFileName', () => {
  it('should return the correct language for a given file path', () => {
    expect(getLanguageByFileName('example.jsx')).toBe('javascript-react')
    expect(getLanguageByFileName('example.tsx')).toBe('typescript-react')
    expect(getLanguageByFileName('example.mjs')).toBe('javascript')
    expect(getLanguageByFileName('example.cjs')).toBe('javascript')
    expect(getLanguageByFileName('example.mts')).toBe('typescript')
    expect(getLanguageByFileName('example.astro')).toBe('astro')
    expect(getLanguageByFileName('example.vue')).toBe('vue')
  })

  it("should return 'javascript' for unsupported extensions", () => {
    expect(getLanguageByFileName('example.txt')).toBe('javascript')
    expect(getLanguageByFileName('example.json')).toBe('javascript')
  })
})
