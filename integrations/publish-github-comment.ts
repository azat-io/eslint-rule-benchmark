import type { PullRequestEvent } from '@octokit/webhooks-types'

import { graphql } from '@octokit/graphql'
import fs from 'node:fs/promises'

import { isGithubPullRequest } from './is-github-pull-request'

/** Represents a comment from the GitHub GraphQL API. */
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

  /** The body text of the comment. */
  body: string

  /** The GraphQL Node ID of the comment. */
  id: string
}

/** GitHub Issue Comment - adapting for what we need from GraphQL or REST. */
interface BotCommentInfo {
  /** The numeric ID of the comment (used as comment_id in REST API). */
  databaseId: number

  /** The GraphQL Node ID of the comment (used for GraphQL mutations). */
  id: string
}

/** Represents the page information for GraphQL pagination. */
interface PageInfo {
  /** When paginating forwards, the cursor to continue. */
  endCursor: string | null

  /** When paginating forwards, true if there are more items. */
  hasNextPage: boolean
}

/**
 * Represents the structure of a comments connection from the GitHub GraphQL
 * API.
 */
interface CommentsConnection {
  /** A list of comment nodes. */
  nodes: GraphQLCommentNode[]

  /** Information to aid in pagination. */
  pageInfo: PageInfo
}

/** Unique marker for the bot comment. */
const BOT_COMMENT_MARKER = '<!-- eslint-rule-benchmark-report -->'

/**
 * Posts benchmark results as a comment to a GitHub Pull Request. Uses GraphQL
 * to find existing comments and REST API (initially) to create/update.
 *
 * @example
 *   await publishGithubComment('# Benchmark Results\n| Rule | Time | ...')
 *
 * @param {string} markdownReport - The benchmark report formatted as a Markdown
 *   string.
 * @returns {Promise<void>}
 */
export let publishGithubComment = async (
  markdownReport: string,
): Promise<void> => {
  if (!isGithubPullRequest()) {
    return
  }

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
      return
    }

    let githubToken = process.env['GITHUB_TOKEN']

    let gql = graphql.defaults({
      headers: {
        authorization: `token ${githubToken}`,
      },
    })

    let botCommentInfo: BotCommentInfo | null = null
    let pullRequestNodeId: string | null = null

    interface GraphQLQueryResult {
      repository: {
        pullRequest: {
          comments: CommentsConnection
          id: string
        }
      }
    }

    try {
      let cursor: string | null = null
      let hasNextPage = true
      while (hasNextPage) {
        let queryResult: GraphQLQueryResult =
          // eslint-disable-next-line no-await-in-loop
          await gql<GraphQLQueryResult>(
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
              prNumber: pullRequestNumber,
              repo: repository,
              cursor,
              owner,
            },
          )

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
        if (!comments.pageInfo.hasNextPage) {
          hasNextPage = false
        }
      }
    } catch (gqlError: unknown) {
      let errorValue = gqlError as Error
      console.error(
        `Failed to fetch comments via GraphQL: ${errorValue.message}`,
      )
      return
    }

    let reportBodyWithMarker = `${BOT_COMMENT_MARKER}\n\n${markdownReport}`

    if (botCommentInfo) {
      try {
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
            commentId: botCommentInfo.id,
            body: reportBodyWithMarker,
          },
        )
      } catch (updateError: unknown) {
        let errorValue = updateError as Error
        console.error(
          `Failed to update comment via GraphQL: ${errorValue.message}`,
        )
      }
    } else {
      if (!pullRequestNodeId) {
        console.error('Cannot create comment, Pull Request Node ID not found.')
        return
      }
      try {
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
            body: reportBodyWithMarker,
          },
        )
      } catch (createError: unknown) {
        let errorValue = createError as Error
        console.error(
          `Failed to create comment via GraphQL: ${errorValue.message}`,
        )
      }
    }
  } catch (error: unknown) {
    let errorValue = error as Error
    console.error(`Failed to post comment: ${errorValue.message}`)
  }
}
