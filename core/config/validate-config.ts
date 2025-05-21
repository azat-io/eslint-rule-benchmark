import fs from 'node:fs/promises'
import path from 'node:path'

import type {
  BaseBenchmarkSettings,
  UserBenchmarkConfig,
} from '../../types/user-benchmark-config'

/**
 * Validates BaseBenchmarkSettings (iterations, timeout, warmup).
 *
 * @param {Partial<BaseBenchmarkSettings>} [settings] - The settings object to
 *   validate. Defaults to an empty object if not provided.
 * @returns {string[]} Array of validation error messages.
 */
let validateBaseBenchmarkSettings = (
  settings: Partial<BaseBenchmarkSettings> = {},
): string[] => {
  let errors: string[] = []

  if (
    settings.iterations !== undefined &&
    (typeof settings.iterations !== 'number' || settings.iterations <= 0)
  ) {
    errors.push(`"iterations" must be a positive number`)
  }

  if (
    settings.timeout !== undefined &&
    (typeof settings.timeout !== 'number' || settings.timeout <= 0)
  ) {
    errors.push(`"timeout" must be a positive number`)
  }

  if (settings.warmup !== undefined) {
    if (typeof settings.warmup === 'object') {
      if (
        settings.warmup.iterations !== undefined &&
        (typeof settings.warmup.iterations !== 'number' ||
          settings.warmup.iterations < 0)
      ) {
        errors.push(`"warmup.iterations" must be a non-negative number`)
      }
      if (
        settings.warmup.enabled !== undefined &&
        typeof settings.warmup.enabled !== 'boolean'
      ) {
        errors.push(`"warmup.enabled" must be a boolean`)
      }
    } else {
      errors.push(`"warmup" must be an object`)
    }
  }
  return errors
}

/**
 * Validates the user benchmark configuration according to the new structure,
 * including global settings, individual test specifications (`testSpec`), and
 * their nested test cases (`caseItem`).
 *
 * Checks for:
 *
 * - Presence of the `tests` array.
 * - Validity of global and per-test `BaseBenchmarkSettings` (iterations, timeout,
 *   warmup).
 * - Required properties for each `testSpec` (`name`, `ruleId`, `rulePath`,
 *   `cases` array).
 * - Existence of `rulePath` file.
 * - Required properties for each `caseItem` within `testSpec.cases` (`testPath`).
 * - Existence of `testPath` files/directories.
 * - Correct types and values for `severity` and `options` within `caseItem`.
 *
 * @param {Partial<UserBenchmarkConfig>} config - The user benchmark
 *   configuration object to validate.
 * @param {string} configDirectory - The absolute path to the directory
 *   containing the configuration file. Used for resolving relative paths.
 * @returns {Promise<string[]>} A promise that resolves to an array of
 *   validation error messages. An empty array indicates a valid configuration.
 */
export let validateConfig = async (
  config: Partial<UserBenchmarkConfig>,
  configDirectory: string,
): Promise<string[]> => {
  let errors: string[] = []

  if (
    !config.tests ||
    !Array.isArray(config.tests) ||
    config.tests.length === 0
  ) {
    errors.push(
      'Configuration must include at least one test in the "tests" array.',
    )
    return errors
  }

  errors.push(...validateBaseBenchmarkSettings(config))

  let validationPromises = config.tests.map(async (testSpec, testIndex) => {
    let testSpecErrors: string[] = []
    let testPrefix = `Test "${testSpec.name || `at index ${testIndex}`}"`

    if (!testSpec.name) {
      testSpecErrors.push(`Test at index ${testIndex}: "name" is required.`)
    }

    if (!testSpec.ruleId) {
      testSpecErrors.push(`${testPrefix}: "ruleId" is required.`)
    }

    if (testSpec.rulePath) {
      try {
        let rulePath = path.resolve(configDirectory, testSpec.rulePath)
        await fs.access(rulePath)
      } catch {
        testSpecErrors.push(
          `${testPrefix}: Rule file not found at "${testSpec.rulePath}".`,
        )
      }
    } else {
      testSpecErrors.push(`${testPrefix}: "rulePath" is required.`)
    }

    let baseSettingsErrors = validateBaseBenchmarkSettings(testSpec)
    if (baseSettingsErrors.length > 0) {
      testSpecErrors.push(
        ...baseSettingsErrors.map(error => `${testPrefix}: ${error}`),
      )
    }

    if (!Array.isArray(testSpec.cases) || testSpec.cases.length === 0) {
      testSpecErrors.push(
        `${testPrefix}: must include at least one case in the "cases" array.`,
      )
    } else {
      let caseValidationPromises = testSpec.cases.map(
        async (caseItem, caseIndex) => {
          let caseErrors: string[] = []
          let casePrefix = `${testPrefix}, Case ${caseIndex + 1}`

          if (caseItem.testPath) {
            let pathsToTest = Array.isArray(caseItem.testPath)
              ? caseItem.testPath
              : [caseItem.testPath]

            if (pathsToTest.length === 0) {
              caseErrors.push(
                `${casePrefix}: "testPath" array cannot be empty.`,
              )
            }

            let pathCheckPromises = pathsToTest.map(
              async (pathToTest: string) => {
                if (typeof pathToTest !== 'string') {
                  return `${casePrefix}: each item in "testPath" must be a string.`
                }
                try {
                  let testFilePath = path.resolve(configDirectory, pathToTest)
                  await fs.access(testFilePath)
                  return null
                } catch {
                  return `${casePrefix}: Test file/directory not found at "${pathToTest}".`
                }
              },
            )
            let pathErrors = (await Promise.all(pathCheckPromises)).filter(
              Boolean,
            ) as string[]
            caseErrors.push(...pathErrors)
          } else {
            caseErrors.push(`${casePrefix}: "testPath" is required.`)
          }

          if (
            caseItem.severity !== undefined &&
            (typeof caseItem.severity !== 'number' ||
              ![0, 1, 2].includes(caseItem.severity))
          ) {
            caseErrors.push(`${casePrefix}: "severity" must be 0, 1, or 2.`)
          }

          if (
            caseItem.options !== undefined &&
            !Array.isArray(caseItem.options)
          ) {
            caseErrors.push(`${casePrefix}: "options" must be an array.`)
          }
          return caseErrors
        },
      )
      let allCaseErrors = await Promise.all(caseValidationPromises)
      testSpecErrors.push(...allCaseErrors.flat())
    }

    return testSpecErrors
  })

  let allTestErrors = await Promise.all(validationPromises)

  errors.push(...allTestErrors.flat())

  return errors
}
