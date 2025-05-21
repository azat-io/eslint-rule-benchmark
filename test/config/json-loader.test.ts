import { describe, expect, it } from 'vitest'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

import { jsonLoader } from '../../core/config/json-loader'

describe('jsonLoader', () => {
  it('should parse valid JSON content', () => {
    let content = JSON.stringify({
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    })

    let result = jsonLoader('', content) as UserBenchmarkConfig

    expect(result).toEqual({
      tests: [
        {
          rulePath: 'rule.js',
          testPath: 'test.js',
          ruleId: 'rule',
          name: 'test',
        },
      ],
    })
  })

  it('should throw an error for invalid JSON content', () => {
    let content = '{ invalid json }'

    expect(() => jsonLoader('', content) as UserBenchmarkConfig).toThrow(
      'Failed to load JSON',
    )
  })

  it('should throw an error for empty JSON content', () => {
    let content = ''

    expect(() => jsonLoader('', content) as UserBenchmarkConfig).toThrow(
      'Failed to load JSON',
    )
  })
})
