import { lilconfig } from 'lilconfig'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

import { jitiLoader } from './jiti-loader'
import { jsonLoader } from './json-loader'

interface LoadConfigResult {
  /** The loaded configuration object. */
  config: UserBenchmarkConfig

  /** The path to the configuration file. */
  filepath: string
}

/**
 * Explorer instance for loading configuration files.
 *
 * This instance is configured to search for configuration files in various
 * formats and locations.
 */
let explorer = lilconfig('eslint-rule-benchmark', {
  searchPlaces: [
    'benchmark/config.js',
    'benchmark/config.cjs',
    'benchmark/config.mjs',
    'benchmark/config.ts',
    'benchmark/config.cts',
    'benchmark/config.mts',
    'benchmark/config.json',
  ],
  loaders: {
    '.json': jsonLoader,
    '.cjs': jitiLoader,
    '.mjs': jitiLoader,
    '.cts': jitiLoader,
    '.mts': jitiLoader,
    '.js': jitiLoader,
    '.ts': jitiLoader,
  },
})

/**
 * Load the configuration for the benchmark from the current working directory.
 * Searches for configuration files in various formats in the `benchmark`
 * directory.
 *
 * @param {string} configPath - Optional path to the configuration file.
 * @returns {Promise<LoadConfigResult>} Load configuration result.
 */
export let loadConfig = async (
  configPath?: string,
): Promise<LoadConfigResult> => {
  let searchDirectory = process.cwd()
  if (configPath) {
    searchDirectory = configPath
  }
  let result = await explorer.search(searchDirectory)

  if (!result) {
    throw new Error(`No config found in: ${searchDirectory}`)
  }

  return {
    config: result.config as UserBenchmarkConfig,
    filepath: result.filepath,
  }
}
