import type { components } from '@octokit/openapi-types'

import { beforeEach, afterEach, describe, expect, vi, it } from 'vitest'
import { Octokit } from '@octokit/rest'
import fs from 'node:fs/promises'

import { publishGithubComment } from '../../integrations/publish-github-comment'

type IssueComment = components['schemas']['issue-comment']

vi.mock('node:fs/promises')
vi.mock('@octokit/rest')

let mockCreateComment = vi.fn()
let mockListComments = vi.fn()
let mockUpdateComment = vi.fn()

describe('publishGithubComment', () => {
  let originalEnvironment: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnvironment = { ...process.env }

    vi.resetAllMocks()
    let MockedOctokit = vi.mocked(Octokit)
    MockedOctokit.mockImplementation(
      () =>
        ({
          rest: {
            issues: {
              createComment: mockCreateComment,
              updateComment: mockUpdateComment,
              listComments: mockListComments,
            },
          },
          issues: {
            createComment: mockCreateComment,
            updateComment: mockUpdateComment,
            listComments: mockListComments,
          },
        }) as unknown as InstanceType<typeof Octokit>,
    )
    let mockedReadFile = vi.mocked(fs.readFile)
    mockedReadFile.mockResolvedValue(
      JSON.stringify({
        repository: { owner: { login: 'test-owner' }, name: 'test-repo' },
        // eslint-disable-next-line camelcase
        pull_request: { number: 123 },
      }),
    )
  })

  afterEach(() => {
    process.env = originalEnvironment
  })

  let setValidGhEnvironment = (): void => {
    process.env['GITHUB_ACTIONS'] = 'true'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request_target'
    process.env['GITHUB_TOKEN'] = 'test-token'
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo'
    process.env['GITHUB_EVENT_PATH'] = '/path/to/event.json'
  }

  it('should do nothing if not in GitHub PR context', async () => {
    process.env['GITHUB_ACTIONS'] = 'false'
    await publishGithubComment('test report')
    expect(fs.readFile).not.toHaveBeenCalled()
    expect(mockListComments).not.toHaveBeenCalled()
    expect(mockCreateComment).not.toHaveBeenCalled()
    expect(mockUpdateComment).not.toHaveBeenCalled()
  })

  it('should create a new comment if no existing bot comment is found', async () => {
    setValidGhEnvironment()
    mockListComments.mockResolvedValue({ data: [] })

    await publishGithubComment('new report')

    expect(mockListComments).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      // eslint-disable-next-line camelcase
      issue_number: 123,
    })
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining(
          '<!-- eslint-rule-benchmark-report -->\n\nnew report',
        ) as string,
        owner: 'test-owner',
        repo: 'test-repo',
        // eslint-disable-next-line camelcase
        issue_number: 123,
      }),
    )
    expect(mockUpdateComment).not.toHaveBeenCalled()
  })

  it('should update an existing comment if a bot comment is found', async () => {
    setValidGhEnvironment()
    let existingBotComment: Partial<IssueComment> = {
      user: { login: 'github-actions[bot]' } as IssueComment['user'],
      body: '<!-- eslint-rule-benchmark-report -->\n\nold report',
      id: 999,
    }
    mockListComments.mockResolvedValue({ data: [existingBotComment] })

    await publishGithubComment('updated report')

    expect(mockListComments).toHaveBeenCalledOnce()
    expect(mockUpdateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining(
          '<!-- eslint-rule-benchmark-report -->\n\nupdated report',
        ) as string,
        owner: 'test-owner',
        repo: 'test-repo',
        // eslint-disable-next-line camelcase
        comment_id: 999,
      }),
    )
    expect(mockCreateComment).not.toHaveBeenCalled()
  })

  it('should handle error when GITHUB_EVENT_PATH is invalid', async () => {
    setValidGhEnvironment()
    let mockedReadFile = vi.mocked(fs.readFile)
    mockedReadFile.mockRejectedValue(new Error('File not found'))

    let consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    await publishGithubComment('report')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to post comment: File not found'),
    )
    expect(mockListComments).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('should handle error if GITHUB_REPOSITORY is malformed', async () => {
    setValidGhEnvironment()
    process.env['GITHUB_REPOSITORY'] = 'invalid-repo-format'
    let consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await publishGithubComment('report')
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'GitHub PR Commenter: Could not determine PR number, owner, or repo.',
    )
    expect(mockListComments).not.toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  it('should handle error from listComments API call', async () => {
    setValidGhEnvironment()
    mockListComments.mockRejectedValue(new Error('API list error'))
    let consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    await publishGithubComment('report')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to post comment: API list error'),
    )
    consoleErrorSpy.mockRestore()
  })

  it('should handle error from createComment API call', async () => {
    setValidGhEnvironment()
    mockListComments.mockResolvedValue({ data: [] })
    mockCreateComment.mockRejectedValue(new Error('API create error'))
    let consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    await publishGithubComment('report')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to post comment: API create error'),
    )
    consoleErrorSpy.mockRestore()
  })

  it('should handle error from updateComment API call', async () => {
    setValidGhEnvironment()
    let existingBotComment: Partial<IssueComment> = {
      user: { login: 'github-actions[bot]' } as IssueComment['user'],
      body: '<!-- eslint-rule-benchmark-report -->\n\nold report',
      id: 999,
    }
    mockListComments.mockResolvedValue({ data: [existingBotComment] })
    mockUpdateComment.mockRejectedValue(new Error('API update error'))
    let consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    await publishGithubComment('report')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to post comment: API update error'),
    )
    consoleErrorSpy.mockRestore()
  })
})
