import 'dotenv/config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // Run test files sequentially since they share the same physical database
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
