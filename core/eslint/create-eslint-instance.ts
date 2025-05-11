import type { ESLint, Linter, Rule } from 'eslint'

import { loadESLint } from 'eslint'
import path from 'node:path'

import type { RuleConfig } from '../../types/test-case'

/**
 * Represents the possible structure of an imported ESLint rule module.
 *
 * This interface handles various export patterns found in ESLint plugins and
 * rule modules:
 *
 * - Direct rule export (with meta and create properties)
 * - Rules collection export (module.rules object with rule IDs as keys)
 * - Default export patterns (either a direct rule or an object containing rules)
 *
 * The flexible structure allows for proper typing of dynamically imported
 * modules regardless of their export format.
 */
interface ESLintRuleImport {
  /**
   * Possible default export - either a rule module or an object containing
   * rules.
   */
  default?: { rules?: Record<string, Rule.RuleModule> } | Rule.RuleModule

  /** Collection of rules indexed by rule ID - common in plugin exports. */
  rules?: Record<string, Rule.RuleModule>

  /** Rule creation function - present if the module directly exports a rule. */
  create?: Rule.RuleModule['create']

  /** Rule metadata - present if the module directly exports a rule. */
  meta?: Rule.RuleModule['meta']

  /** Additional properties that might be present in the module. */
  [key: string]: unknown
}

/** Options for creating an ESLint instance. */
interface CreateESLintInstanceOptions {
  /** Additional ESLint configuration options. */
  extraConfig?: Record<string, unknown>

  /** Path to plugins (if applicable). */
  pluginPaths?: string[]

  /** Path to custom parser (if applicable). */
  parserPath?: string

  /** The rule to be tested. */
  rule: RuleConfig
}

/** Result of loading a rule from a file. */
interface RuleLoadResult {
  /** Error message if loading failed. */
  error?: string

  /** The loaded rule module. */
  rule?: unknown
}

/**
 * Extracts an ESLint rule from the imported module.
 *
 * This function handles different module export formats:
 *
 * 1. Direct export where the module itself is a rule (has meta and create)
 * 2. Named export in module.rules[ruleId]
 * 3. Default export that could either be a rule or an object with rules
 *
 * @param {ESLintRuleImport} moduleExport - The imported module.
 * @param {string} ruleId - ID of the rule to extract.
 * @returns {Rule.RuleModule | undefined} The ESLint rule if found, undefined
 *   otherwise.
 */
let extractRule = (
  moduleExport: ESLintRuleImport,
  ruleId: string,
): Rule.RuleModule | undefined => {
  if (moduleExport.meta && moduleExport.create) {
    return moduleExport as Rule.RuleModule
  }

  if (moduleExport.rules?.[ruleId]) {
    return moduleExport.rules[ruleId]
  }

  let defaultExport = moduleExport.default

  if (defaultExport) {
    if ('meta' in defaultExport && 'create' in defaultExport) {
      return defaultExport
    }

    if ('rules' in defaultExport && defaultExport.rules?.[ruleId]) {
      return defaultExport.rules[ruleId]
    }
  }

  return undefined
}

/**
 * Loads a parser module from the specified path.
 *
 * @param {string} parserPath - Path to the parser module.
 * @returns {Promise<object>} Parsed module with default export handling.
 */
let loadParserModule = async (parserPath: string): Promise<Linter.Parser> => {
  try {
    let module: unknown = await import(parserPath)
    return (
      typeof module === 'object' && module !== null && 'default' in module
        ? module.default
        : module
    ) as Linter.Parser
  } catch (error) {
    let errorValue = error as Error
    throw new Error(`Failed to load parser: ${errorValue.message}`)
  }
}

/**
 * Converts numeric severity level to ESLint string severity format.
 *
 * @param {0 | 1 | 2} level - Numeric severity level (0 - off, 1 - warn, 2 -
 *   error).
 * @returns {'off' | 'warn' | 'error'} String representation of severity level.
 */
let toSeverity = (level: 0 | 1 | 2): 'error' | 'warn' | 'off' => {
  switch (level) {
    case 0:
      return 'off'
    case 1:
      return 'warn'
    case 2:
      return 'error'
  }
}

/**
 * Loads an ESLint rule from the specified file path.
 *
 * @param {string} rulePath - Path to the file containing the rule.
 * @param {string} ruleId - ID of the rule to load.
 * @returns {Promise<RuleLoadResult>} Promise resolving to the rule load result.
 */
let loadRuleFromFile = async (
  rulePath: string,
  ruleId: string,
): Promise<RuleLoadResult> => {
  let result: RuleLoadResult = {}

  try {
    let absolutePath = path.isAbsolute(rulePath)
      ? rulePath
      : path.resolve(process.cwd(), rulePath)

    let moduleExport = (await import(absolutePath)) as ESLintRuleImport
    result.rule = extractRule(moduleExport, ruleId)
  } catch (error) {
    let errorValue = error as Error
    result.error = errorValue.message
  }

  return result
}

/**
 * Creates an ESLint instance configured to test a specific rule.
 *
 * @param {CreateESLintInstanceOptions} instanceOptions - Options for creating
 *   the ESLint instance.
 * @returns {Promise<ESLint>} Promise resolving to configured ESLint instance.
 */
export let createESLintInstance = async (
  instanceOptions: CreateESLintInstanceOptions,
): Promise<ESLint> => {
  let { extraConfig = {}, parserPath, rule } = instanceOptions

  let { path: rulePath, options = [], severity, ruleId } = rule

  let ruleModule: Rule.RuleModule | undefined

  if (rulePath) {
    let loadResult = await loadRuleFromFile(rulePath, ruleId)
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
  let ruleEntry: Linter.RuleEntry =
    options.length > 0 ? [severityString, ...options] : severityString

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

  let flatConfig: Linter.Config = {
    rules: {
      [uniqueRuleId]: ruleEntry,
    },
    plugins,
    ...(parserPath && {
      languageOptions: {
        parser: await loadParserModule(parserPath),
      },
    }),
    ...extraConfig,
  }

  let FlatESLint = await loadESLint({
    useFlatConfig: true,
  })

  return new FlatESLint({
    ruleFilter: ({ ruleId: currentRuleId }) => currentRuleId === uniqueRuleId,
    overrideConfig: [flatConfig],
    overrideConfigFile: null,
    allowInlineConfig: false,
  })
}
