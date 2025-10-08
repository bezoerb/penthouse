import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 5000,
    environment: 'node',
    include: ['test/**/*.test.js'],
    teardownTimeout: 2000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Each test file gets its own fork
        isolate: true      // Ensure complete isolation
      }
    },
    // Run test files sequentially to avoid parallel browser issues
    fileParallelism: false
  }
})

