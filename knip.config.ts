import type { KnipConfig } from 'knip'

export default {
  ignoreDependencies: [
    '@typescript-eslint/parser',
    'astro-eslint-parser',
    'svelte-eslint-parser',
    'vue-eslint-parser',
  ],
  ignore: ['changelog.config.ts'],
  entry: 'cli/index.ts',
} satisfies KnipConfig
