import { describe, expect, it } from 'vitest'

import { getFileExtension } from '../../../core/utilities/get-file-extension'

describe('getFileExtension', () => {
  it('should return the correct file extension for a given filename', () => {
    expect(getFileExtension('example.txt')).toBe('txt')
    expect(getFileExtension('example.tar.gz')).toBe('gz')
    expect(getFileExtension('example')).toBe('')
    expect(getFileExtension('.hiddenfile')).toBe('')
    expect(getFileExtension('example.')).toBe('')
  })

  it('should handle filenames with multiple dots correctly', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz')
    expect(getFileExtension('archive.tar.bz2')).toBe('bz2')
  })
})
