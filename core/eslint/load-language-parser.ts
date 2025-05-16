import type { Linter } from 'eslint'
import type { Jiti } from 'jiti'

import type { LANGUAGES } from '../../constants'

/** Result of loading a parser from a package. */
interface ParserLoadResult {
  /** The loaded parser module. */
  parser?: Linter.Parser | null

  /** Error message if loading failed. */
  error?: string
}

type Language = (typeof LANGUAGES)[number]

/**
 * Mapping of language identifiers to their corresponding ESLint parsers.
 *
 * This mapping allows for dynamic loading of the appropriate parser based on
 * the language being tested. The parsers are used to parse the code samples
 * before running ESLint rules against them.
 */
const LANGUAGE_PARSER_MAP = {
  'typescript-react': '@typescript-eslint/parser',
  typescript: '@typescript-eslint/parser',
  svelte: 'svelte-eslint-parser',
  astro: 'astro-eslint-parser',
  vue: 'vue-eslint-parser',
  'javascript-react': null,
  javascript: null,
} as const

/**
 * Extracts a parser from the imported module.
 *
 * This function handles different module export formats:
 *
 * 1. Direct parser export
 * 2. Default export that could be the parser
 *
 * @param {unknown} moduleExport - The imported module.
 * @returns {Linter.Parser | undefined} The parser if found, undefined
 *   otherwise.
 */
let extractParser = (moduleExport: unknown): Linter.Parser | undefined => {
  if (
    moduleExport &&
    typeof moduleExport === 'object' &&
    (('parse' in moduleExport && typeof moduleExport.parse === 'function') ||
      ('parseForESLint' in moduleExport &&
        typeof moduleExport.parseForESLint === 'function'))
  ) {
    return moduleExport as Linter.Parser
  }

  if (
    moduleExport &&
    typeof moduleExport === 'object' &&
    'default' in moduleExport
  ) {
    let defaultExport = (moduleExport as { default: unknown }).default

    if (
      defaultExport &&
      typeof defaultExport === 'object' &&
      (('parse' in defaultExport &&
        typeof defaultExport.parse === 'function') ||
        ('parseForESLint' in defaultExport &&
          typeof defaultExport.parseForESLint === 'function'))
    ) {
      return defaultExport as Linter.Parser
    }
  }

  return undefined
}

/**
 * Attempts to load parser for the specified language.
 *
 * @param {Jiti} jiti - Jiti instance for dynamic imports.
 * @param {Language} language - The language to load parser for
 * @returns {Promise<ParserLoadResult>} Promise resolving to the parser load
 *   result
 */
export let loadLanguageParser = async (
  jiti: Jiti,
  language: Language,
): Promise<ParserLoadResult> => {
  let result: ParserLoadResult = {}

  let parserName = LANGUAGE_PARSER_MAP[language]
  if (!parserName) {
    return { parser: null }
  }

  try {
    let moduleExport = await jiti.import(parserName)
    result.parser = extractParser(moduleExport)

    if (!result.parser) {
      result.error = `Parser not found in module: ${parserName}`
    }
  } catch (error) {
    let errorValue = error as Error
    result.error = errorValue.message
  }

  return result
}
