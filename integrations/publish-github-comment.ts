import type { PullRequestEvent } from '@octokit/webhooks-types'
import type { components } from '@octokit/openapi-types'

import { Octokit } from '@octokit/rest'
import fs from 'node:fs/promises'

import { isGithubPullRequest } from './is-github-pull-request'

/** GitHub Issue Comment */
type IssueComment = components['schemas']['issue-comment']

/** Unique marker for the bot comment. */
const BOT_COMMENT_MARKER = '<!-- eslint-rule-benchmark-report -->'

/**
 * Posts benchmark results as a comment to a GitHub Pull Request.
 *
 * @example
 *   await github('# Benchmark Results\n| Rule | Time | ...')
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

    let octokit = new Octokit({
      auth: process.env['GITHUB_TOKEN'],
    })

    let existingComments = await octokit.rest.issues.listComments({
      // eslint-disable-next-line camelcase
      issue_number: pullRequestNumber,
      repo: repository,
      owner,
    })

    let botComment: IssueComment | null = null
    if (Array.isArray(existingComments.data)) {
      for (let comment of existingComments.data) {
        if (comment.body?.includes(BOT_COMMENT_MARKER)) {
          botComment = comment
          break
        }
      }
    }

    let reportBodyWithMarker = `${BOT_COMMENT_MARKER}\n\n${markdownReport}`

    if (botComment) {
      await octokit.issues.updateComment({
        body: reportBodyWithMarker,
        // eslint-disable-next-line camelcase
        comment_id: botComment.id,
        repo: repository,
        owner,
      })
      console.info(
        `GitHub PR Commenter: Successfully updated comment on PR #${pullRequestNumber}.`,
      )
    } else {
      await octokit.issues.createComment({
        // eslint-disable-next-line camelcase
        issue_number: pullRequestNumber,
        body: reportBodyWithMarker,
        repo: repository,
        owner,
      })
    }
  } catch (error: unknown) {
    let errorValue = error as Error
    console.error(
      `GitHub PR Commenter: Failed to post comment: ${errorValue.message}`,
    )
  }
}
