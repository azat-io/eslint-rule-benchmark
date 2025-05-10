import { describe, expect, it } from 'vitest'

import { createTestCase } from '../../../core/test-case/create-test-case'

describe('createTestCase', () => {
  it('should create a test case with default values', () => {
    let config = createTestCase({
      rule: {
        ruleId: 'test-rule',
        severity: 1,
      },
      name: 'Test Case',
      id: 'test-case-1',
      samples: [],
    })

    expect(config.name).toBe('Test Case')
    expect(config.iterationCount).toBe(100)
    expect(config.samples).toHaveLength(0)
  })

  it('should override default values with provided parameters', () => {
    let config = createTestCase({
      rule: {
        ruleId: 'custom-rule',
        severity: 2,
      },
      name: 'Custom Test Case',
      id: 'custom-test-case',
      iterationCount: 50,
      samples: [],
    })

    expect(config.name).toBe('Custom Test Case')
    expect(config.iterationCount).toBe(50)
  })
})
