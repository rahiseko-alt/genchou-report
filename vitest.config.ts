import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // tsconfig.json の paths と揃える。片方だけ直すと単体テストが解決できなくなる。
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'app/**/*.test.ts'],
  },
})
