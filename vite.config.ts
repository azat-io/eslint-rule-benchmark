import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: [
        path.resolve(__dirname, 'cli/index.ts'),
        path.resolve(__dirname, 'core/index.ts'),
      ],
      fileName: (_format, entryName) => `${entryName}.js`,
      name: 'eslint-rule-benchmark',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        exports: 'auto',
      },
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
    },
    minify: false,
  },
  plugins: [
    dts({
      include: [
        path.join(__dirname, 'cli'),
        path.join(__dirname, 'constants'),
        path.join(__dirname, 'core'),
        path.join(__dirname, 'reporters'),
        path.join(__dirname, 'runners'),
        path.join(__dirname, 'types'),
      ],
      insertTypesEntry: true,
      strictOutput: true,
    }),
  ],
})
