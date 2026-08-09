import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import { createESLintInstance } from '../../../core/eslint/create-eslint-instance'

/**
 * End-to-end coverage for JSON support: exercises the real ESLint instance and
 * the real jsonc-eslint-parser (no mocks) to ensure a `.json` sample is parsed
 * into a JSON AST and reaches the rule under test.
 */
describe('createESLintInstance (JSON end-to-end)', () => {
  let temporaryDirectory: string
  let rulePath: string

  beforeAll(async () => {
    temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'erb-json-test-'),
    )
    rulePath = path.join(temporaryDirectory, 'json-property.cjs')

    // Report on `JSONProperty`, a node only jsonc-eslint-parser produces. A
    // JavaScript parser would never trigger this visitor.
    await fs.writeFile(
      rulePath,
      [
        'module.exports = {',
        "  meta: { type: 'problem', messages: { found: 'json property' } },",
        '  create(context) {',
        '    return {',
        '      JSONProperty(node) {',
        "        context.report({ node, messageId: 'found' })",
        '      },',
        '    }',
        '  },',
        '}',
        '',
      ].join('\n'),
    )
  })

  afterAll(async () => {
    await fs.rm(temporaryDirectory, { recursive: true, force: true })
  })

  it('parses a JSON sample with jsonc-eslint-parser and lints it', async () => {
    let eslint = await createESLintInstance({
      rule: { ruleId: 'json-test/json-property', path: rulePath, severity: 2 },
      configDirectory: temporaryDirectory,
      languages: ['json'],
    })

    let [result] = await eslint.lintText('{ "a": 1, "b": 2 }', {
      filePath: 'sample.json',
    })

    let fatal = result!.messages.filter(message => message.fatal)
    expect(fatal).toStrictEqual([])

    let reported = result!.messages.filter(
      message => message.ruleId === 'eslint-rule-benchmark/json-property',
    )
    expect(reported).toHaveLength(2)
  }, 60_000)
})
