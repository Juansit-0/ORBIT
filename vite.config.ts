import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: { port: 5173 },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: { include: ['src/core/**'], reporter: ['text', 'html'] },
  },
})
