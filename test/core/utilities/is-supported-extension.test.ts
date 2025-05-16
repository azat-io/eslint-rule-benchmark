import { describe, expect, it } from 'vitest'

import { isSupportedExtension } from '../../../core/utilities/is-supported-extension'

describe('isSupportedExtension', () => {
  it('should return true for supported extensions', () => {
    expect(isSupportedExtension('js')).toBeTruthy()
    expect(isSupportedExtension('ts')).toBeTruthy()
    expect(isSupportedExtension('jsx')).toBeTruthy()
    expect(isSupportedExtension('tsx')).toBeTruthy()
    expect(isSupportedExtension('vue')).toBeTruthy()
    expect(isSupportedExtension('svelte')).toBeTruthy()
    expect(isSupportedExtension('astro')).toBeTruthy()
  })

  it('should return false for unsupported extensions', () => {
    expect(isSupportedExtension('txt')).toBeFalsy()
    expect(isSupportedExtension('json')).toBeFalsy()
    expect(isSupportedExtension('html')).toBeFalsy()
  })
})
