import type { KnipConfig } from 'knip'

export default {
  ignoreDependencies: [
    '@typescript-eslint/parser',
    'astro-eslint-parser',
    'svelte-eslint-parser',
    'vue-eslint-parser',
  ],
  entry: ['cli/index.ts', 'core/index.ts'],
} satisfies KnipConfig
