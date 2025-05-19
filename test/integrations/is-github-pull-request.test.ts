import { describe, expect, it } from 'vitest'

import { isGithubPullRequest } from '../../integrations/is-github-pull-request'

describe('isGithubPullRequest', () => {
  it('should return true when all conditions are met', () => {
    process.env['GITHUB_ACTIONS'] = 'true'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request'
    process.env['GITHUB_TOKEN'] = 'some-token'
    process.env['GITHUB_REPOSITORY'] = 'some-repo'
    process.env['GITHUB_EVENT_PATH'] = 'some-path'

    expect(isGithubPullRequest()).toBeTruthy()
  })

  it("should return false when GITHUB_ACTIONS is not 'true'", () => {
    process.env['GITHUB_ACTIONS'] = 'false'
    expect(isGithubPullRequest()).toBeFalsy()
  })

  it("should return false when GITHUB_EVENT_NAME is not 'pull_request' or 'pull_request_target'", () => {
    process.env['GITHUB_ACTIONS'] = 'true'
    process.env['GITHUB_EVENT_NAME'] = 'push'
    expect(isGithubPullRequest()).toBeFalsy()
  })

  it('should return false when GITHUB_TOKEN is undefined', () => {
    process.env['GITHUB_ACTIONS'] = 'true'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request'
    delete process.env['GITHUB_TOKEN']
    expect(isGithubPullRequest()).toBeFalsy()
  })

  it('should return false when GITHUB_REPOSITORY is undefined', () => {
    process.env['GITHUB_ACTIONS'] = 'true'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request'
    delete process.env['GITHUB_REPOSITORY']
    expect(isGithubPullRequest()).toBeFalsy()
  })

  it('should return false when GITHUB_EVENT_PATH is undefined', () => {
    process.env['GITHUB_ACTIONS'] = 'true'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request'
    delete process.env['GITHUB_EVENT_PATH']
    expect(isGithubPullRequest()).toBeFalsy()
  })
})
