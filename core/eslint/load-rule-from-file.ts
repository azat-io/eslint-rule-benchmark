import type { Rule } from 'eslint'
import type { Jiti } from 'jiti'

import path from 'node:path'

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

interface LoadRuleFromFileOptions {
  /** The path to the user configuration directory. */
  configDirectory: string

  /** The path to the rule file. */
  rulePath: string

  /** The ID of the rule to load. */
  ruleId: string
}

/** Result of loading a rule from a file. */
interface RuleLoadResult {
  /** Error message if loading failed. */
  error?: string

  /** The loaded rule module. */
  rule?: unknown
}

/**
 * Loads an ESLint rule from the specified file path.
 *
 * @param {Jiti} jiti - Jiti instance for dynamic imports.
 * @param {LoadRuleFromFileOptions} options - Options for loading the rule.
 * @returns {Promise<RuleLoadResult>} Promise resolving to the rule load result.
 */
export async function loadRuleFromFile(
  jiti: Jiti,
  options: LoadRuleFromFileOptions,
): Promise<RuleLoadResult> {
  let result: RuleLoadResult = {}
  let { configDirectory, rulePath, ruleId } = options

  try {
    let absolutePath = path.isAbsolute(rulePath)
      ? rulePath
      : path.resolve(configDirectory, rulePath)

    let moduleExport: ESLintRuleImport = await jiti.import(absolutePath)
    result.rule = extractRule(moduleExport, ruleId)
  } catch (error) {
    let errorValue = error as Error
    result.error = errorValue.message
  }

  return result
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
function extractRule(
  moduleExport: ESLintRuleImport,
  ruleId: string,
): Rule.RuleModule | undefined {
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
