import type { Loader } from 'lilconfig'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

/**
 * Loader for JSON files.
 *
 * @param _filepath - Path to the file (not used directly but required by Loader
 *   interface).
 * @param content - Content of the JSON file.
 * @returns Parsed JSON configuration object.
 */
export let jsonLoader: Loader = (_filepath, content): UserBenchmarkConfig => {
  try {
    return JSON.parse(content) as UserBenchmarkConfig
  } catch (error) {
    throw new Error('Failed to load JSON', {
      cause: error,
    })
  }
}
