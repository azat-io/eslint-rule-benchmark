import { beforeEach, afterEach, describe, expect, vi, it } from 'vitest'
import { graphql } from '@octokit/graphql'
import fs from 'node:fs/promises'

import { publishGithubComment } from '../../integrations/publish-github-comment'

vi.mock('node:fs/promises')
vi.mock('@octokit/graphql', () => {
  let graphqlMock = vi.fn()
  return Promise.resolve({
    graphql: {
      defaults: () => graphqlMock,
    },
    default: graphqlMock,
  })
})

let graphqlMock = vi.mocked(graphql.defaults({}))

describe('publishGithubComment (GraphQL)', () => {
  let originalEnvironment: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnvironment = { ...process.env }

    graphqlMock.mockReset()
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({
        // eslint-disable-next-line camelcase
        pull_request: { number: 123 },
      }),
    )

    process.env['GITHUB_ACTIONS'] = 'true'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request'
    process.env['GITHUB_EVENT_PATH'] = '/path/to/event.json'
    process.env['GITHUB_TOKEN'] = 'test-token'
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo'
  })

  afterEach(() => {
    process.env = originalEnvironment
  })

  it('does nothing if not in PR context', async () => {
    process.env['GITHUB_ACTIONS'] = 'false'
    await publishGithubComment('text')
    expect(fs.readFile).not.toHaveBeenCalled()
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('creates comment if no existing marker found', async () => {
    graphqlMock
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            comments: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [],
            },
            id: 'PR_NODE_ID',
          },
        },
      })
      .mockResolvedValueOnce({
        addComment: {
          commentEdge: {
            node: { id: 'NEW_COMMENT_ID' },
          },
        },
      })

    await publishGithubComment('report')

    expect(graphqlMock).toHaveBeenCalledWith(
      expect.stringContaining('addComment'),
      expect.objectContaining({
        body: expect.stringContaining(
          '<!-- eslint-rule-benchmark-report -->',
        ) as string,
        subjectId: 'PR_NODE_ID',
      }),
    )
  })

  it('updates comment if marker found', async () => {
    graphqlMock
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            comments: {
              nodes: [
                {
                  body: '<!-- eslint-rule-benchmark-report -->\n\nold content',
                  author: { login: 'github-actions[bot]' },
                  id: 'COMMENT_NODE_ID',
                  databaseId: 456,
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
            id: 'PR_NODE_ID',
          },
        },
      })
      .mockResolvedValueOnce({
        updateIssueComment: {
          issueComment: {
            id: 'COMMENT_NODE_ID',
          },
        },
      })

    await publishGithubComment('updated report')

    expect(graphqlMock).toHaveBeenCalledWith(
      expect.stringContaining('updateIssueComment'),
      expect.objectContaining({
        body: expect.stringContaining('updated report') as string,
        commentId: 'COMMENT_NODE_ID',
      }),
    )
  })

  it('handles readFile error', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('file not found'))
    let spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await publishGithubComment('fallback')
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to post comment: file not found'),
    )
    spy.mockRestore()
  })

  it('handles malformed GITHUB_REPOSITORY', async () => {
    process.env['GITHUB_REPOSITORY'] = 'invalidformat'
    let warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await publishGithubComment('warn test')
    expect(warnSpy).toHaveBeenCalledWith(
      'GitHub PR Commenter: Could not determine PR number, owner, or repo.',
    )
    warnSpy.mockRestore()
  })

  it('logs error when GraphQL query fails', async () => {
    graphqlMock.mockRejectedValueOnce(new Error('GraphQL query failed'))
    let spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await publishGithubComment('err test')
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch comments via GraphQL'),
    )
    spy.mockRestore()
  })

  it('logs error when update mutation fails', async () => {
    graphqlMock
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            comments: {
              nodes: [
                {
                  body: '<!-- eslint-rule-benchmark-report -->\n\nsomething',
                  author: { login: 'github-actions[bot]' },
                  id: 'COMMENT_NODE_ID',
                  databaseId: 456,
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
            id: 'PR_NODE_ID',
          },
        },
      })
      .mockRejectedValueOnce(new Error('mutation failed'))

    let spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await publishGithubComment('update fail test')
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update comment via GraphQL'),
    )
    spy.mockRestore()
  })

  it('logs error when addComment mutation fails', async () => {
    graphqlMock
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            comments: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [],
            },
            id: 'PR_NODE_ID',
          },
        },
      })
      .mockRejectedValueOnce(new Error('create mutation failed'))

    let spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await publishGithubComment('create fail test')
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create comment via GraphQL'),
    )
    spy.mockRestore()
  })

  it('logs error if pull request node ID is missing before creating comment', async () => {
    graphqlMock.mockResolvedValueOnce({
      repository: {
        pullRequest: {
          comments: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [],
          },
          id: undefined,
        },
      },
    })

    let errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await publishGithubComment('test')

    expect(errorSpy).toHaveBeenCalledWith(
      'Cannot create comment, Pull Request Node ID not found.',
    )

    expect(
      graphqlMock.mock.calls.some(
        ([query]) => typeof query === 'string' && query.includes('addComment'),
      ),
    ).toBeFalsy()

    errorSpy.mockRestore()
  })
})
