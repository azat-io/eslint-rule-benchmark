import fs from 'node:fs/promises'
import path from 'node:path'

import type { ReporterOptions, TestSpecResult } from '../types/benchmark-config'
import type { UserBenchmarkConfig } from '../types/user-benchmark-config'

import { publishGithubComment } from '../integrations/publish-github-comment'
import { isGithubPullRequest } from '../integrations/is-github-pull-request'
import { createReporter } from './create-reporter'

/**
 * Executes the appropriate reporters based on the provided options and
 * benchmark results.
 *
 * This function iterates through the reporter options. For each option, it
 * generates a report using `createReporter` with all test specification results
 * and then either prints it to the console or saves it to a file, based on the
 * reporter's configuration.
 *
 * Additionally, when running in a GitHub Actions pull request context, this
 * function automatically generates a markdown report and publishes it as a
 * comment to the pull request, independent of the configured reporter options.
 * This GitHub integration works seamlessly without requiring additional
 * configuration from the user.
 *
 * @param {TestSpecResult[]} allTestSpecResults - An array containing the
 *   results for all test specifications.
 * @param {UserBenchmarkConfig} userConfig - The user's benchmark configuration,
 *   used for global settings.
 * @param {ReporterOptions[]} reporterOptionsFromCli - An array of reporter
 *   options specifying format and output.
 * @returns {Promise<void>} A promise that resolves when all reports have been
 *   processed.
 */
export async function runReporters(
  allTestSpecResults: TestSpecResult[],
  userConfig: UserBenchmarkConfig,
  reporterOptionsFromCli: ReporterOptions[],
): Promise<void> {
  if (reporterOptionsFromCli.length === 0) {
    console.warn('No reporters configured. Skipping report generation.')
    return
  }

  await Promise.all(
    reporterOptionsFromCli.map(async reporterOpt => {
      try {
        let reportContent = await createReporter(
          allTestSpecResults,
          userConfig,
          reporterOpt.format,
        )

        if (reporterOpt.outputPath) {
          let resolvedOutputPath = path.resolve(reporterOpt.outputPath)
          await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true })
          await fs.writeFile(resolvedOutputPath, reportContent, 'utf8')
          console.info(
            `Report in "${reporterOpt.format}" format saved to: ${resolvedOutputPath}`,
          )
        } else if (reporterOpt.format === 'console') {
          console.info(reportContent)
        } else {
          console.warn(
            `Report content for format "${reporterOpt.format}" (no outputPath specified):\n`,
          )
          console.warn(reportContent)
        }
      } catch (error: unknown) {
        let errorValue = error as Error
        console.error(
          `Error generating report for format "${reporterOpt.format}": ${errorValue.message}`,
          errorValue.stack,
        )
      }
    }),
  )

  if (isGithubPullRequest()) {
    try {
      let markdownReport = await createReporter(
        allTestSpecResults,
        userConfig,
        'markdown',
      )

      await publishGithubComment(markdownReport)

      console.info('GitHub comment published successfully.')
    } catch (error) {
      let errorValue = error as Error
      console.error(`Error publishing GitHub comment: ${errorValue.message}`)
    }
  }
}
