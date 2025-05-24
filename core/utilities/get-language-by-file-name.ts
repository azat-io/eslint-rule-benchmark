import type { SUPPORTED_EXTENSIONS, LANGUAGES } from '../../constants'

import { isSupportedExtension } from './is-supported-extension'
import { getFileExtension } from './get-file-extension'

type Extensions = (typeof SUPPORTED_EXTENSIONS)[number]

type Language = (typeof LANGUAGES)[number]

/**
 * Maps file extensions to their corresponding languages.
 *
 * This mapping is used to determine the language of a file based on its
 * extension. If the extension is not supported, it defaults to 'javascript'.
 */
let extensionMap = {
  jsx: 'javascript-react',
  tsx: 'typescript-react',
  mjs: 'javascript',
  cjs: 'javascript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  ts: 'typescript',
  svelte: 'svelte',
  astro: 'astro',
  vue: 'vue',
} satisfies Record<Extensions, Language>

/**
 * Get the language of a file based on its extension.
 *
 * @param {string} filePath - The path to the file.
 * @returns {Language} The language of the file or 'javascript' if the extension
 *   is not supported.
 */
export let getLanguageByFileName = (filePath: string): Language => {
  let extension = getFileExtension(filePath)

  if (isSupportedExtension(extension)) {
    return extensionMap[extension]
  }

  return 'javascript'
}
