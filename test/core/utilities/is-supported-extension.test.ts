import { describe, expect, it } from 'vitest'

import { isSupportedExtension } from '../../../core/utilities/is-supported-extension'

describe('isSupportedExtension', () => {
  it('should return true for supported extensions', () => {
    expect(isSupportedExtension('js')).toBe(true)
    expect(isSupportedExtension('ts')).toBe(true)
    expect(isSupportedExtension('jsx')).toBe(true)
    expect(isSupportedExtension('tsx')).toBe(true)
    expect(isSupportedExtension('vue')).toBe(true)
    expect(isSupportedExtension('svelte')).toBe(true)
    expect(isSupportedExtension('astro')).toBe(true)
    expect(isSupportedExtension('json')).toBe(true)
    expect(isSupportedExtension('jsonc')).toBe(true)
    expect(isSupportedExtension('json5')).toBe(true)
  })

  it('should return false for unsupported extensions', () => {
    expect(isSupportedExtension('txt')).toBe(false)
    expect(isSupportedExtension('html')).toBe(false)
  })
})
