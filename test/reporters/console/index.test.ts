import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import type { SingleRuleResult } from '../../../runners/run-single-rule'

import {
  createConsoleReporter,
  consoleReporter,
} from '../../../reporters/console'
import { formatTable } from '../../../reporters/console/format-table'

vi.mock('../../../reporters/console/format-table', () => ({
  formatTable: vi.fn().mockReturnValue('formatted-table'),
}))

/* -------------------------------------------------------------------------- */

describe('console reporters', () => {
  let dummyResult = { rule: { id: 'rule-1' } } as SingleRuleResult

  let infoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    infoSpy.mockRestore()
    vi.clearAllMocks()
  })

  it('createConsoleReporter() renders the correct output', () => {
    let reporter = createConsoleReporter()

    reporter(dummyResult)

    expect(formatTable).toHaveBeenCalledWith(dummyResult)
    expect(infoSpy).toHaveBeenCalledWith('formatted-table')
  })

  it('consoleReporter() creates a console reporter', () => {
    let reporter = consoleReporter()

    expect(reporter).toBeInstanceOf(Function)

    reporter(dummyResult)

    expect(formatTable).toHaveBeenCalledWith(dummyResult)
    expect(infoSpy).toHaveBeenCalledWith('formatted-table')
  })
})
