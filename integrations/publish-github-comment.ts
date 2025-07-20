import type { PullRequestEvent } from '@octokit/webhooks-types'

import { graphql } from '@octokit/graphql'
import fs from 'node:fs/promises'

import { isGithubPullRequest } from './is-github-pull-request'

/** Represents a comment node from the GitHub GraphQL API. */
interface GraphQLCommentNode {
  /**
   * The author of the comment. Null if the author is a GitHub App without a
   * user.
   */
  author: {
    /** The login username of the author. */
    login: string
  } | null

  /** The numeric ID of the comment, used as comment_id in REST API. */
  databaseId: number

  /** The body text of the comment in markdown format. */
  body: string

  /** The GraphQL Node ID of the comment used for mutations. */
  id: string
}

/** Represents the result structure from GitHub's GraphQL repository query. */
interface GraphQLQueryResult {
  /** The repository containing the pull request. */
  repository: {
    /** The pull request being queried. */
    pullRequest: {
      /** Connection to comments associated with the pull request. */
      comments: CommentsConnection
      /** The GraphQL Node ID of the pull request. */
      id: string
    }
  }
}

/** Context information for a GitHub Pull Request operation. */
interface PullRequestContext {
  /** The number of the pull request. */
  pullRequestNumber: number
  /** The GraphQL Node ID of the pull request. */
  pullRequestNodeId: string
  /** The name of the repository. */
  repository: string
  /** The owner/organization of the repository. */
  owner: string
}

/** Pagination information for GraphQL cursor-based pagination. */
interface PageInfo {
  /** The cursor to use when paginating forwards to get more items. */
  endCursor: string | null

  /** Whether there are more items available when paginating forwards. */
  hasNextPage: boolean
}

/**
 * Represents a connection to comments from the GitHub GraphQL API with
 * pagination support.
 */
interface CommentsConnection {
  /** Array of comment nodes returned by the query. */
  nodes: GraphQLCommentNode[]

  /** Pagination information for retrieving additional comments. */
  pageInfo: PageInfo
}

/** Contains information about a bot comment for identification and manipulation. */
interface BotCommentInfo {
  /** The numeric ID of the comment used in REST API operations. */
  databaseId: number

  /** The GraphQL Node ID of the comment used for GraphQL mutations. */
  id: string
}

/**
 * Type definition for a configured GraphQL client function.
 *
 * @param query - The GraphQL query string to execute
 * @param variables - Optional variables to pass to the query
 * @returns Promise that resolves to the query result
 */
type GraphQLClient = (
  query: string,
  variables?: Record<string, unknown>,
) => Promise<unknown>

/** HTML comment marker used to identify bot-generated comments. */
const BOT_COMMENT_MARKER = '<!-- eslint-rule-benchmark-report -->'

/**
 * Publishes benchmark results as a comment to a GitHub Pull Request.
 *
 * This function handles the complete workflow of posting benchmark results:
 *
 * - Checks if running in a GitHub Pull Request context
 * - Searches for existing bot comments to update instead of creating duplicates
 * - Uses GraphQL API for efficient comment management
 * - Includes error handling for all GitHub API operations
 *
 * @example
 *   const report = `
 *   # Benchmark Results
 *   | Rule | Time (ms) | Change |
 *   |------|-----------|--------|
 *   | rule1 | 150 | +5% |
 *   `
 *   await publishGithubComment(report)
 *
 * @example
 *   // Simple usage with plain text
 *   await publishGithubComment('All benchmarks passed! ✅')
 *
 * @param {string} markdownReport - The benchmark report formatted as markdown
 *   string
 * @returns {Promise<void>} Promise that resolves when the comment operation
 *   completes
 */
export async function publishGithubComment(
  markdownReport: string,
): Promise<void> {
  if (!isGithubPullRequest()) {
    return
  }

  try {
    let context = await getPullRequestContext()
    if (!context) {
      return
    }

    let gql = createGraphQLClient()
    let { pullRequestNodeId, botCommentInfo } = await findBotComment(
      gql,
      context,
    )

    let reportBodyWithMarker = `${BOT_COMMENT_MARKER}\n\n${markdownReport}`

    if (botCommentInfo) {
      try {
        await updateBotComment(gql, botCommentInfo.id, reportBodyWithMarker)
      } catch (error) {
        let errorValue = error as Error
        console.error(
          'Failed to update comment via GraphQL:',
          errorValue.message,
        )
      }
    } else {
      if (!pullRequestNodeId) {
        console.error('Cannot create comment, Pull Request Node ID not found.')
        return
      }

      try {
        await createBotComment(gql, pullRequestNodeId, reportBodyWithMarker)
      } catch (error) {
        let errorValue = error as Error
        console.error(
          'Failed to create comment via GraphQL:',
          errorValue.message,
        )
      }
    }
  } catch (error) {
    console.error('Failed to post comment:', error)
  }
}

/**
 * Searches through all comments in a pull request to find an existing bot
 * comment. Uses GraphQL pagination to handle pull requests with many comments.
 *
 * @example
 *   const gql = createGraphQLClient()
 *   const context = {
 *     pullRequestNumber: 123,
 *     owner: 'owner',
 *     repository: 'repo',
 *     pullRequestNodeId: '',
 *   }
 *   const { botCommentInfo, pullRequestNodeId } = await findBotComment(
 *     gql,
 *     context,
 *   )
 *
 * @param {GraphQLClient} gql - Configured GraphQL client instance for GitHub
 *   API calls
 * @param {PullRequestContext} context - Pull request context containing
 *   repository and PR information
 * @returns {Promise<{
 *   botCommentInfo: BotCommentInfo | null
 *   pullRequestNodeId: string | null
 * }>}
 *   Promise resolving to bot comment info and PR node ID, or null if not found
 * @throws Will throw an error if the GraphQL query fails
 */
async function findBotComment(
  gql: GraphQLClient,
  context: PullRequestContext,
): Promise<{
  botCommentInfo: BotCommentInfo | null
  pullRequestNodeId: string | null
}> {
  let botCommentInfo: BotCommentInfo | null = null
  let pullRequestNodeId: string | null = null
  let cursor: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    try {
      // eslint-disable-next-line no-await-in-loop
      let queryResult = (await gql(
        `
          query (
            $owner: String!
            $repo: String!
            $prNumber: Int!
            $cursor: String
          ) {
            repository(owner: $owner, name: $repo) {
              pullRequest(number: $prNumber) {
                id
                comments(first: 100, after: $cursor) {
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                  nodes {
                    id
                    databaseId
                    body
                    author {
                      login
                    }
                  }
                }
              }
            }
          }
        `,
        {
          prNumber: context.pullRequestNumber,
          repo: context.repository,
          owner: context.owner,
          cursor,
        },
      )) as GraphQLQueryResult

      pullRequestNodeId ??= queryResult.repository.pullRequest.id

      let { comments } = queryResult.repository.pullRequest
      let commentsNodes = comments.nodes

      for (let commentNode of commentsNodes) {
        if (commentNode.body.includes(BOT_COMMENT_MARKER)) {
          botCommentInfo = {
            databaseId: commentNode.databaseId,
            id: commentNode.id,
          }
          hasNextPage = false
          break
        }
      }

      if (hasNextPage) {
        ;({ hasNextPage } = comments.pageInfo)
        cursor = comments.pageInfo.endCursor
      }
    } catch (error) {
      let errorValue = error as Error
      console.error('Failed to fetch comments via GraphQL:', errorValue.message)
      throw error
    }
  }

  return { pullRequestNodeId, botCommentInfo }
}

/**
 * Extracts pull request context from GitHub Actions environment. Reads the
 * GitHub event payload file and parses repository information.
 *
 * @example
 *   const context = await getPullRequestContext()
 *   if (context) {
 *     console.log(`Processing PR #${context.pullRequestNumber}`)
 *   }
 *
 * @returns {Promise<PullRequestContext | null>} Promise resolving to pull
 *   request context or null if extraction fails
 * @throws Will log error and return null if event payload cannot be read or
 *   parsed
 */
async function getPullRequestContext(): Promise<PullRequestContext | null> {
  try {
    let eventPayloadString = await fs.readFile(
      process.env['GITHUB_EVENT_PATH']!,
      'utf8',
    )
    let eventPayload = JSON.parse(eventPayloadString) as PullRequestEvent

    let pullRequestNumber = eventPayload.pull_request.number
    let [owner, repository] = process.env['GITHUB_REPOSITORY']!.split('/')

    if (!pullRequestNumber || !owner || !repository) {
      console.warn(
        'GitHub PR Commenter: Could not determine PR number, owner, or repo.',
      )
      return null
    }

    return {
      pullRequestNodeId: '',
      pullRequestNumber,
      repository,
      owner,
    }
  } catch (error) {
    let errorValue = error as Error
    console.error('Failed to read GitHub event payload:', errorValue.message)
    return null
  }
}

/**
 * Creates a new comment on a GitHub pull request using GraphQL mutation.
 *
 * @example
 *   const gql = createGraphQLClient()
 *   await createBotComment(gql, 'PR_123456', '# Benchmark Results\n...')
 *
 * @param {GraphQLClient} gql - Configured GraphQL client instance for GitHub
 *   API calls
 * @param {string} pullRequestNodeId - The GraphQL Node ID of the pull request
 *   to comment on
 * @param {string} body - The markdown content of the comment to create
 * @returns {string} Promise that resolves when the comment is successfully
 *   created
 * @throws Will throw an error if the GraphQL mutation fails
 */
async function createBotComment(
  gql: GraphQLClient,
  pullRequestNodeId: string,
  body: string,
): Promise<void> {
  await gql(
    `
      mutation ($subjectId: ID!, $body: String!) {
        addComment(input: { subjectId: $subjectId, body: $body }) {
          commentEdge {
            node {
              id
            }
          }
        }
      }
    `,
    {
      subjectId: pullRequestNodeId,
      body,
    },
  )
}

/**
 * Updates the content of an existing comment using GraphQL mutation.
 *
 * @example
 *   const gql = createGraphQLClient()
 *   await updateBotComment(
 *     gql,
 *     'IC_123456',
 *     '# Updated Benchmark Results\n...',
 *   )
 *
 * @param {GraphQLClient} gql - Configured GraphQL client instance for GitHub
 *   API calls
 * @param {string} commentId - The GraphQL Node ID of the comment to update
 * @param {string} body - The new markdown content for the comment
 * @returns {Promise<void>} Promise that resolves when the comment is
 *   successfully updated
 * @throws Will throw an error if the GraphQL mutation fails
 */
async function updateBotComment(
  gql: GraphQLClient,
  commentId: string,
  body: string,
): Promise<void> {
  await gql(
    `
      mutation ($commentId: ID!, $body: String!) {
        updateIssueComment(input: { id: $commentId, body: $body }) {
          issueComment {
            id
          }
        }
      }
    `,
    {
      commentId,
      body,
    },
  )
}

/**
 * Creates and configures a GraphQL client for GitHub API operations. Uses the
 * GITHUB_TOKEN environment variable for authentication.
 *
 * @example
 *   const gql = createGraphQLClient()
 *   const result = await gql('query { viewer { login } }')
 *
 * @returns {GraphQLClient} Configured GraphQL client function ready for GitHub
 *   API calls
 * @throws Will throw an error if GITHUB_TOKEN is not available
 */
function createGraphQLClient(): GraphQLClient {
  let githubToken = process.env['GITHUB_TOKEN']

  return graphql.defaults({
    headers: {
      authorization: `token ${githubToken}`,
    },
  })
}
