import type { ESLint, Linter, Rule } from 'eslint'

import { loadESLint } from 'eslint'
import { createJiti } from 'jiti'

import type { RuleConfig } from '../../types/test-case'
import type { LANGUAGES } from '../../constants'

import { loadLanguageParser } from './load-language-parser'
import { loadRuleFromFile } from './load-rule-from-file'
import { toSeverity } from './to-severity'

/** Options for creating an ESLint instance. */
interface CreateESLintInstanceOptions {
  /** Optional path to custom ESLint config file. */
  eslintConfigFile?: string

  /** The path to the user configuration directory. */
  configDirectory: string

  /** Languages to be tested. */
  languages: Language[]

  /** The rule to be tested. */
  rule: RuleConfig
}

type Language = (typeof LANGUAGES)[number]

/**
 * Creates a Jiti instance for module loading.
 *
 * This instance is configured to handle ES modules and CommonJS modules
 * seamlessly, allowing for dynamic imports of ESLint rules and plugins.
 */
let jiti = createJiti(import.meta.url, {
  interopDefault: true,
  requireCache: false,
})

/**
 * Creates an ESLint instance configured to test a specific rule.
 *
 * @param {CreateESLintInstanceOptions} instanceOptions - Options for creating
 *   the ESLint instance.
 * @returns {Promise<ESLint>} Promise resolving to configured ESLint instance.
 */
export async function createESLintInstance(
  instanceOptions: CreateESLintInstanceOptions,
): Promise<ESLint> {
  let { eslintConfigFile, configDirectory, languages, rule } = instanceOptions

  let { path: rulePath, severity, options, ruleId } = rule

  let ruleModule: Rule.RuleModule | undefined

  if (rulePath) {
    let loadResult = await loadRuleFromFile(jiti, {
      configDirectory,
      rulePath,
      ruleId,
    })
    if (loadResult.error) {
      throw new Error(`Failed to load rule: ${loadResult.error}`)
    }
    ruleModule = loadResult.rule as Rule.RuleModule
  }

  if (rulePath && !ruleModule) {
    throw new Error(`Rule module not found: ${ruleId}`)
  }

  let uniqueNamespace = 'eslint-rule-benchmark'

  let localName = ruleId.includes('/') ? ruleId.split('/')[1]! : ruleId

  let severityString = toSeverity(severity)
  let ruleEntry: Linter.RuleEntry = options
    ? [severityString, ...options]
    : severityString

  let uniqueRuleId = `${uniqueNamespace}/${localName}`

  let plugins = ruleModule
    ? {
        [uniqueNamespace]: {
          rules: {
            [localName]: ruleModule,
          },
        },
      }
    : undefined

  let additionalOptions: Partial<Linter.Config> = {}

  let parserResults = await Promise.all(
    languages.map(language => loadLanguageParser(jiti, language)),
  )
  let loadedParsers = parserResults
    .filter(result => !result.error && result.parser)
    .map(result => result.parser!)

  if (loadedParsers.length > 0) {
    let [parser] = loadedParsers
    additionalOptions.languageOptions = {
      parser,
    }
  }

  if (
    languages.includes('javascript-react') ||
    languages.includes('typescript-react')
  ) {
    if (additionalOptions.languageOptions) {
      additionalOptions.languageOptions.parserOptions = {
        ...additionalOptions.languageOptions.parserOptions,
        ecmaFeatures: {
          jsx: true,
        },
      }
    } else {
      additionalOptions.languageOptions = {
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      }
    }
  }

  let flatConfig: Linter.Config = {
    rules: {
      [uniqueRuleId]: ruleEntry,
    },
    plugins,
    ...additionalOptions,
  }

  let FlatESLint = await loadESLint({
    useFlatConfig: true,
  })

  return new FlatESLint({
    ruleFilter: ({ ruleId: currentRuleId }) => currentRuleId === uniqueRuleId,
    overrideConfigFile: eslintConfigFile ?? null,
    overrideConfig: [flatConfig],
    allowInlineConfig: false,
    fix: true,
  })
}
