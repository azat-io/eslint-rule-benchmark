import type { ESLint, Linter } from 'eslint'

import { beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'node:path'

import type { LANGUAGES } from '../../../constants'

import { createESLintInstance } from '../../../core/eslint/create-eslint-instance'

interface ESLintForTesting extends ESLint {
  overrideConfig?: {
    languageOptions?: {
      parserOptions?: {
        ecmaFeatures?: {
          [key: string]: unknown
          jsx?: boolean
        }
        [key: string]: unknown
      }
      parser?: unknown
    }
    plugins?: Record<string, unknown>
    rules?: Record<string, unknown>
  }[]
  ruleFilter(rule: { ruleId: string }): boolean
  overrideConfigFile: string | null
  allowInlineConfig: boolean
}

type Language = (typeof LANGUAGES)[number]

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
let directRulePath: string
let collectionRulePath: string
let defaultRulePath: string
let defaultCollectionRulePath: string

function getRules(eslint: unknown): Linter.RuleEntry[] {
  return (eslint as ESLintForTesting).overrideConfig?.[0]!
    .rules as unknown as Linter.RuleEntry[]
}

function firstKey(object?: Record<string, unknown>): string {
  return Object.keys(object!)[0]!
}

describe('createESLintInstance', () => {
  beforeAll(() => {
    temporaryDirectory = '/mock-temp-dir'
    directRulePath = `${temporaryDirectory}/direct.mjs`
    collectionRulePath = `${temporaryDirectory}/collection.mjs`
    defaultRulePath = `${temporaryDirectory}/defaultRule.mjs`
    defaultCollectionRulePath = `${temporaryDirectory}/defaultCollection.mjs`
  })

  it('loads direct rule export', async () => {
    let eslint = await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/direct', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
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
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
    })
    expect(eslint).toBeInstanceOf(Object)
  })

  it('loads default-exported rule', async () => {
    let eslint = await createESLintInstance({
      rule: { path: defaultRulePath, ruleId: 'ns/default', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
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
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
    })
    expect(es).toBeInstanceOf(Object)
  })

  it('supports severities 0/1/2', async () => {
    let severities = [0, 1, 2] as const
    await Promise.all(
      severities.map(async severity => {
        let eslint = await createESLintInstance({
          rule: { ruleId: `ns/s${severity}`, path: directRulePath, severity },
          configDirectory: temporaryDirectory,
          languages: ['javascript'],
        })
        expect(eslint).toBeInstanceOf(Object)
      }),
    )
  })

  it('works when RuleConfig given directly', async () => {
    let eslint = (await createESLintInstance({
      rule: { ruleId: 'just-id', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
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
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
    })) as ESLintForTesting
    let rules = getRules(eslint) as unknown as Record<string, unknown>
    let key = firstKey(rules)
    expect(rules[key]).toEqual(['error', { x: true }])
  })

  it('rule id in config endsWith local name', async () => {
    let local = 'plain'
    let eslint = (await createESLintInstance({
      rule: { path: directRulePath, ruleId: local, severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
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
        configDirectory: temporaryDirectory,
        languages: ['javascript'],
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
        configDirectory: temporaryDirectory,
        languages: ['javascript'],
      }),
    ).rejects.toThrow()
  })

  it('caches same rulePath+id', async () => {
    await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/cache', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
    })
    let eslint = await createESLintInstance({
      rule: { path: directRulePath, ruleId: 'ns/cache', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
    })
    expect(eslint).toBeInstanceOf(Object)
  })

  it('throws when module loaded but rule id is absent', async () => {
    let missingPath = path.join(temporaryDirectory, 'no-match.mjs')

    await expect(
      createESLintInstance({
        rule: { ruleId: 'ns/no-match', path: missingPath, severity: 2 },
        configDirectory: temporaryDirectory,
        languages: ['javascript'],
      }),
    ).rejects.toThrow()
  })

  it('accepts relative path to rule file', async () => {
    let relativePath = path.relative(process.cwd(), directRulePath)
    let es = await createESLintInstance({
      rule: { ruleId: 'ns/relative', path: relativePath, severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
    })
    expect(es).toBeInstanceOf(Object)
  })

  it('throws when file contains non-rule format', async () => {
    let invalidFormatPath = path.join(temporaryDirectory, 'invalid-format.mjs')

    await expect(
      createESLintInstance({
        rule: { path: invalidFormatPath, ruleId: 'any-id', severity: 2 },
        configDirectory: temporaryDirectory,
        languages: ['javascript'],
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
        configDirectory: temporaryDirectory,
        languages: ['javascript'],
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
      configDirectory: temporaryDirectory,
      languages: ['javascript'],
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

  it('loads TypeScript parser for typescript language', async () => {
    constructorOptions = {}

    await createESLintInstance({
      rule: { ruleId: 'test-rule', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['typescript'],
    })

    let config = (
      constructorOptions['overrideConfig'] as Record<string, unknown>[]
    )[0] as Linter.Config

    expect(config.languageOptions?.parser).toBeDefined()
  })

  it('adds JSX support for React languages', async () => {
    constructorOptions = {}

    await createESLintInstance({
      rule: { ruleId: 'test-rule', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['javascript-react'],
    })

    let config = (
      constructorOptions['overrideConfig'] as Record<string, unknown>[]
    )[0] as Linter.Config

    expect(
      config.languageOptions?.parserOptions?.ecmaFeatures?.jsx,
    ).toBeTruthy()
  })

  it('combines parser and JSX support for TypeScript React', async () => {
    constructorOptions = {}

    await createESLintInstance({
      rule: { ruleId: 'test-rule', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['typescript-react'],
    })

    let config = (
      constructorOptions['overrideConfig'] as Record<string, unknown>[]
    )[0] as Linter.Config

    expect(config.languageOptions?.parser).toBeDefined()
    expect(
      config.languageOptions?.parserOptions?.ecmaFeatures?.jsx,
    ).toBeTruthy()
  })

  it('handles multiple languages with parsers', async () => {
    constructorOptions = {}

    await createESLintInstance({
      languages: ['typescript', 'vue', 'svelte'],
      rule: { ruleId: 'test-rule', severity: 2 },
      configDirectory: temporaryDirectory,
    })

    let config = (
      constructorOptions['overrideConfig'] as Record<string, unknown>[]
    )[0] as Linter.Config

    expect(config.languageOptions?.parser).toBeDefined()
  })

  it('supports all language types', async () => {
    let supportedLanguages = [
      'javascript',
      'typescript',
      'javascript-react',
      'typescript-react',
      'vue',
      'svelte',
      'astro',
    ] as Language[]

    await Promise.all(
      supportedLanguages.map(async language => {
        let eslint = await createESLintInstance({
          rule: { ruleId: 'test-rule', severity: 2 },
          configDirectory: temporaryDirectory,
          languages: [language],
        })
        expect(eslint).toBeInstanceOf(Object)
      }),
    )
  })

  it('handles parser loading errors gracefully', async () => {
    let eslint = await createESLintInstance({
      rule: { ruleId: 'test-rule', severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['typescript'],
    })

    expect(eslint).toBeInstanceOf(Object)

    let config = (
      constructorOptions['overrideConfig'] as Record<string, unknown>[]
    )[0] as Linter.Config

    expect(config.rules).toBeDefined()
  })
})
