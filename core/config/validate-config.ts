import fs from 'node:fs/promises'
import path from 'node:path'

import type { UserBenchmarkConfig } from '../../types/user-benchmark-config'

/**
 * Validates the user benchmark configuration and returns validation errors.
 *
 * @param {Partial<UserBenchmarkConfig>} config - Configuration to validate.
 * @param {string} configDirectory - Path to the configuration directory.
 * @returns {Promise<string[]>} Array of validation error messages (empty if
 *   valid).
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
      'Configuration must include at least one test in the "tests" array',
    )
    return errors
  }

  if (
    config.iterations !== undefined &&
    (typeof config.iterations !== 'number' || config.iterations <= 0)
  ) {
    errors.push('Global "iterations" must be a positive number')
  }

  if (
    config.timeout !== undefined &&
    (typeof config.timeout !== 'number' || config.timeout <= 0)
  ) {
    errors.push('Global "timeout" must be a positive number')
  }

  if (config.warmup !== undefined) {
    if (typeof config.warmup === 'object') {
      if (
        config.warmup.iterations !== undefined &&
        (typeof config.warmup.iterations !== 'number' ||
          config.warmup.iterations < 0)
      ) {
        errors.push('Global "warmup.iterations" must be a non-negative number')
      }

      if (
        config.warmup.enabled !== undefined &&
        typeof config.warmup.enabled !== 'boolean'
      ) {
        errors.push('Global "warmup.enabled" must be a boolean')
      }
    } else {
      errors.push('Global "warmup" must be an object')
    }
  }

  let validationPromises = config.tests.map(async (test, i) => {
    let testErrors: string[] = []
    let prefix = `Test at index ${i}`

    if (!test.name) {
      testErrors.push(`${prefix}: "name" is required`)
    }

    if (!test.ruleId) {
      testErrors.push(`${prefix}: "ruleId" is required`)
    }

    if (test.rulePath) {
      try {
        let rulePath = path.resolve(configDirectory, test.rulePath)
        await fs.access(rulePath)
      } catch {
        testErrors.push(`${prefix}: Rule file not found at "${test.rulePath}"`)
      }
    } else {
      testErrors.push(`${prefix}: "rulePath" is required`)
    }

    if (test.testPath) {
      if (typeof test.testPath === 'string') {
        try {
          let testFilePath = path.resolve(configDirectory, test.testPath)
          await fs.access(testFilePath)
        } catch {
          testErrors.push(
            `${prefix}: Test file not found at "${test.testPath}"`,
          )
        }
      } else if (Array.isArray(test.testPath)) {
        let pathCheckPromises = test.testPath.map(async testPath => {
          try {
            let testFilePath = path.resolve(configDirectory, testPath)
            await fs.access(testFilePath)
            return null
          } catch {
            return `${prefix}: Test file not found at "${testPath}"`
          }
        })

        let pathErrors = (await Promise.all(pathCheckPromises)).filter(
          Boolean,
        ) as string[]

        testErrors.push(...pathErrors)
      } else {
        testErrors.push(
          `${prefix}: "testPath" must be a string or an array of strings`,
        )
      }
    } else {
      testErrors.push(`${prefix}: "testPath" is required`)
    }

    if (
      typeof test.severity === 'number' &&
      ![0, 1, 2].includes(test.severity)
    ) {
      testErrors.push(`${prefix}: "severity" must be 0, 1, or 2`)
    }

    if (test.options !== undefined && !Array.isArray(test.options)) {
      testErrors.push(`${prefix}: "options" must be an array`)
    }

    if (test.benchmarkSettings !== undefined) {
      if (typeof test.benchmarkSettings === 'object') {
        if (
          test.benchmarkSettings.iterations !== undefined &&
          (typeof test.benchmarkSettings.iterations !== 'number' ||
            test.benchmarkSettings.iterations <= 0)
        ) {
          testErrors.push(
            `${prefix}: "benchmarkSettings.iterations" must be a positive number`,
          )
        }

        if (
          test.benchmarkSettings.timeout !== undefined &&
          (typeof test.benchmarkSettings.timeout !== 'number' ||
            test.benchmarkSettings.timeout <= 0)
        ) {
          testErrors.push(
            `${prefix}: "benchmarkSettings.timeout" must be a positive number`,
          )
        }

        if (test.benchmarkSettings.warmup !== undefined) {
          if (typeof test.benchmarkSettings.warmup === 'object') {
            if (
              test.benchmarkSettings.warmup.iterations !== undefined &&
              (typeof test.benchmarkSettings.warmup.iterations !== 'number' ||
                test.benchmarkSettings.warmup.iterations < 0)
            ) {
              testErrors.push(
                `${prefix}: "benchmarkSettings.warmup.iterations" must be a non-negative number`,
              )
            }

            if (
              test.benchmarkSettings.warmup.enabled !== undefined &&
              typeof test.benchmarkSettings.warmup.enabled !== 'boolean'
            ) {
              testErrors.push(
                `${prefix}: "benchmarkSettings.warmup.enabled" must be a boolean`,
              )
            }
          } else {
            testErrors.push(
              `${prefix}: "benchmarkSettings.warmup" must be an object`,
            )
          }
        }
      } else {
        testErrors.push(`${prefix}: "benchmarkSettings" must be an object`)
      }
    }

    return testErrors
  })

  let allTestErrors = await Promise.all(validationPromises)

  errors.push(...allTestErrors.flat())

  return errors
}
