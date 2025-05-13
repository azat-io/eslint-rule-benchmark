import type { ESLint, Linter } from 'eslint'

import { beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'node:path'

import { createESLintInstance } from '../../../core/eslint/create-eslint-instance'

interface ESLintForTesting extends ESLint {
  overrideConfig?: {
    languageOptions?: {
      parser?: unknown
    }
    plugins?: Record<string, unknown>
    rules?: Record<string, unknown>
  }[]
  ruleFilter(rule: { ruleId: string }): boolean
  overrideConfigFile: string | null
  allowInlineConfig: boolean
}

let constructorOptions: Record<string, unknown> = {}

vi.mock('eslint', () => {
  class FakeESLint {
    public overrideConfig: Record<string, unknown>[] | undefined
    public ruleFilter: (rule: { ruleId: string }) => boolean
    public overrideConfigFile: undefined | string | null
    public allowInlineConfig: undefined | boolean

    private constructor(options: {
      ruleFilter(rule: { ruleId: string }): boolean
      overrideConfig: Record<string, unknown>[]
      overrideConfigFile: string | null
      allowInlineConfig: boolean
    }) {
      constructorOptions = options
      this.overrideConfig = options.overrideConfig
      this.ruleFilter = options.ruleFilter
      this.allowInlineConfig = options.allowInlineConfig
      this.overrideConfigFile = options.overrideConfigFile
    }

    public static lintText(): Promise<Linter.LintMessage[]> {
      return Promise.resolve([
        {
          messages: [],
        },
      ] as unknown as Linter.LintMessage[])
    }
  }

  return { loadESLint: vi.fn().mockResolvedValue(FakeESLint) }
})

vi.mock('jiti', () => ({
  createJiti: () => ({
    import: vi.fn().mockImplementation((filepath: string) => {
      if (filepath.includes('direct')) {
        return {
          meta: { docs: { description: 'direct' }, type: 'problem' },
          create: () => ({}),
        }
      }

      if (filepath.includes('collection')) {
        return {
          rules: {
            'collection/rule': {
              meta: { type: 'problem' },
              create: () => ({}),
            },
          },
        }
      }

      if (filepath.includes('defaultRule')) {
        return {
          default: { meta: { type: 'problem' }, create: () => ({}) },
        }
      }

      if (filepath.includes('defaultCollection')) {
        return {
          default: {
            rules: {
              'defcoll/rule': { meta: { type: 'problem' }, create: () => ({}) },
            },
          },
        }
      }

      if (filepath.includes('no-match') || filepath.includes('missing')) {
        throw new Error(`Module not found: ${filepath}`)
      }

      if (filepath.includes('invalid-format')) {
        return {
          someData: 'not a rule',
          someFunction: () => 42,
        }
      }

      if (filepath.includes('other-rule')) {
        return {
          rules: {
            'existing-rule': { meta: { type: 'problem' }, create: () => ({}) },
          },
        }
      }

      if (filepath.includes('parser') && !filepath.includes('missing')) {
        if (filepath.includes('default')) {
          return { default: { parse: () => ({}) } }
        }
        return { parse: () => ({}) }
      }

      throw new Error(`Unexpected import path in test: ${filepath}`)
    }),
  }),
}))

let temporaryDirectory: string
let parserPath: string
let invalidParserPath: string
let directRulePath: string
let collectionRulePath: string
let defaultRulePath: string
let defaultCollectionRulePath: string

let getRules = (eslint: unknown): Linter.RuleEntry[] =>
  (eslint as ESLintForTesting).overrideConfig?.[0]!
    .rules as unknown as Linter.RuleEntry[]

let firstKey = (object?: Record<string, unknown>): string =>
  Object.keys(object!)[0]!

describe('createESLintInstance', () => {
  beforeAll(() => {
    temporaryDirectory = '/mock-temp-dir'
    parserPath = `${temporaryDirectory}/parser.mjs`
    invalidParserPath = `${temporaryDirectory}/missing-parser.mjs`
    directRulePath = `${temporaryDirectory}/direct.mjs`
    collectionRulePath = `${temporaryDirectory}/collection.mjs`
    defaultRulePath = `${temporaryDirectory}/defaultRule.mjs`
    defaultCollectionRulePath = `${temporaryDirectory}/defaultCollection.mjs`
  })

  it('loads direct rule export', async () => {
    let eslint = await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/direct', severity: 2 },
    })
    expect(eslint).toBeInstanceOf(Object)
  })

  it('loads collection rule', async () => {
    let eslint = await createESLintInstance({
      rule: {
        ruleId: 'collection/rule',
        path: collectionRulePath,
        severity: 2,
      },
    })
    expect(eslint).toBeInstanceOf(Object)
  })

  it('loads default-exported rule', async () => {
    let eslint = await createESLintInstance({
      rule: { path: defaultRulePath, ruleId: 'ns/default', severity: 2 },
    })
    expect(eslint).toBeInstanceOf(Object)
  })

  it('loads default-exported collection', async () => {
    let es = await createESLintInstance({
      rule: {
        path: defaultCollectionRulePath,
        ruleId: 'defcoll/rule',
        severity: 2,
      },
    })
    expect(es).toBeInstanceOf(Object)
  })

  it('supports severities 0/1/2', async () => {
    let severities = [0, 1, 2] as const
    await Promise.all(
      severities.map(async severity => {
        let eslint = await createESLintInstance({
          rule: { ruleId: `ns/s${severity}`, path: directRulePath, severity },
        })
        expect(eslint).toBeInstanceOf(Object)
      }),
    )
  })

  it('adds custom parser', async () => {
    let eslint = (await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/p', severity: 2 },
      parserPath,
    })) as ESLintForTesting
    expect(eslint.overrideConfig?.[0]?.languageOptions?.parser).toBeDefined()
  })

  it('throws on bad parser path', async () => {
    await expect(
      createESLintInstance({
        rule: { path: directRulePath, ruleId: 'ns/bad', severity: 2 },
        parserPath: invalidParserPath,
      }),
    ).rejects.toThrow(/Failed to load parser/u)
  })

  it('works when RuleConfig given directly', async () => {
    let eslint = (await createESLintInstance({
      rule: { ruleId: 'just-id', severity: 2 },
    })) as ESLintForTesting
    expect(eslint).toBeInstanceOf(Object)
  })

  it('stores options array', async () => {
    let eslint = (await createESLintInstance({
      rule: {
        options: [{ x: true }],
        ruleId: 'ns/with-opt',
        path: directRulePath,
        severity: 2,
      },
    })) as ESLintForTesting
    let rules = getRules(eslint) as unknown as Record<string, unknown>
    let key = firstKey(rules)
    expect(rules[key]).toEqual(['error', { x: true }])
  })

  it('rule id in config endsWith local name', async () => {
    let local = 'plain'
    let eslint = (await createESLintInstance({
      rule: { path: directRulePath, ruleId: local, severity: 2 },
    })) as ESLintForTesting
    let rules = getRules(eslint) as unknown as Record<string, unknown>
    let key = firstKey(rules)
    expect(key.endsWith(`/${local}`)).toBeTruthy()
  })

  it('throws if rule file missing', async () => {
    await expect(
      createESLintInstance({
        rule: {
          path: path.join(temporaryDirectory, 'nope.mjs'),
          ruleId: 'ns/miss',
          severity: 2,
        },
      }),
    ).rejects.toThrow(/Failed to load rule/u)
  })

  it('throws if rule id not found inside file', async () => {
    await expect(
      createESLintInstance({
        rule: {
          path: path.join(temporaryDirectory, 'no-match.mjs'),
          ruleId: 'ns/no-match',
          severity: 2,
        },
      }),
    ).rejects.toThrow()
  })

  it('caches same rulePath+id', async () => {
    await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/cache', severity: 2 },
    })
    let eslint = await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/cache', severity: 2 },
    })
    expect(eslint).toBeInstanceOf(Object)
  })

  it('accepts parser with default export', async () => {
    let filePath = path.join(temporaryDirectory, 'parser-default.mjs')
    let eslint = (await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/defp', severity: 2 },
      parserPath: filePath,
    })) as ESLintForTesting
    expect(eslint.overrideConfig?.[0]?.languageOptions?.parser).toBeDefined()
  })

  it('throws when module loaded but rule id is absent', async () => {
    let missingPath = path.join(temporaryDirectory, 'no-match.mjs')

    await expect(
      createESLintInstance({
        rule: { ruleId: 'ns/no-match', path: missingPath, severity: 2 },
      }),
    ).rejects.toThrow()
  })

  it('accepts relative path to rule file', async () => {
    let relativePath = path.relative(process.cwd(), directRulePath)
    let es = await createESLintInstance({
      rule: { ruleId: 'ns/relative', path: relativePath, severity: 2 },
    })
    expect(es).toBeInstanceOf(Object)
  })

  it('throws when file contains non-rule format', async () => {
    let invalidFormatPath = path.join(temporaryDirectory, 'invalid-format.mjs')

    await expect(
      createESLintInstance({
        rule: { path: invalidFormatPath, ruleId: 'any-id', severity: 2 },
      }),
    ).rejects.toThrow(/Rule module not found/u)
  })

  it('throws specific error when rule not found in loaded module', async () => {
    let missingRulePath = path.join(temporaryDirectory, 'other-rule.mjs')

    await expect(
      createESLintInstance({
        rule: {
          ruleId: 'non-existing-rule',
          path: missingRulePath,
          severity: 2,
        },
      }),
    ).rejects.toThrow(/Rule module not found: non-existing-rule/u)
  })

  it('isolates testing to only the specified rule', async () => {
    constructorOptions = {}

    await createESLintInstance({
      rule: {
        ruleId: 'test/rule-isolation',
        path: directRulePath,
        severity: 2,
      },
    })

    expect(constructorOptions['ruleFilter']).toBeDefined()
    expect(constructorOptions['allowInlineConfig']).toBeFalsy()
    expect(constructorOptions['overrideConfigFile']).toBeNull()

    let rules = (
      constructorOptions['overrideConfig'] as Record<
        string,
        { rules: Linter.RuleEntry[] }
      >
    )[0]!.rules as unknown as Record<string, Linter.RuleEntry>

    let [targetRuleId] = Object.keys(rules)

    let ruleFilter = constructorOptions['ruleFilter'] as (argument: {
      ruleId: string
    }) => boolean

    expect(ruleFilter({ ruleId: targetRuleId! })).toBeTruthy()
    expect(ruleFilter({ ruleId: 'some-other-rule' })).toBeFalsy()
  })
})
