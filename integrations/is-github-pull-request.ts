/**
 * Checks if the script is running in a GitHub Actions environment and if the
 * event is a pull request.
 *
 * @returns {boolean} - Returns true if the script is running in a GitHub
 *   Actions
 */
export function isGithubPullRequest(): boolean {
  return (
    process.env['GITHUB_ACTIONS'] === 'true' &&
    (process.env['GITHUB_EVENT_NAME'] === 'pull_request' ||
      process.env['GITHUB_EVENT_NAME'] === 'pull_request_target') &&
    process.env['GITHUB_TOKEN'] !== undefined &&
    process.env['GITHUB_REPOSITORY'] !== undefined &&
    process.env['GITHUB_EVENT_PATH'] !== undefined
  )
}
