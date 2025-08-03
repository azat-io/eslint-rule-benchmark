import type { Loader } from 'lilconfig'

import { createJiti } from 'jiti'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

/**
 * Creates a Jiti instance for module loading.
 *
 * This instance is configured to handle ES modules and CommonJS modules
 * seamlessly, allowing for dynamic imports of configuration files.
 */
let jiti = createJiti(import.meta.url, {
  interopDefault: true,
  requireCache: false,
})

/**
 * Loader for JavaScript and TypeScript files using jiti.
 *
 * @param filepath - Path to the file to load.
 * @param _content - Content of the file (not used).
 * @returns Loaded and processed configuration.
 */
export let jitiLoader: Loader = async (filepath: string, _content: string) => {
  try {
    let loader: { default: UserBenchmarkConfig } = await jiti.import(filepath)
    return loader.default
  } catch (error) {
    throw new Error(`Error loading file ${filepath}`, {
      cause: error,
    })
  }
}
