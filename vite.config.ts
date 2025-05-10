import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'node:path'

export default defineConfig({
  build: {
    lib: {
      fileName: (_format, entryName) => `${entryName}.js`,
      entry: [path.resolve(__dirname, 'cli/index.ts')],
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
      include: [path.join(__dirname, 'cli'), path.join(__dirname, 'core')],
      insertTypesEntry: true,
      strictOutput: true,
      rollupTypes: true,
    }),
  ],
})
