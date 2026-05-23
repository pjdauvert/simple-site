import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@simple-site/interfaces': fileURLToPath(
        new URL('../../libs/interfaces/src/index.ts', import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/functions/**/*.test.ts'],
  },
});
