import { defineConfig } from 'vitest/config';

/**
 * The shared contracts own their tests: these schemas are the agreement
 * between the web app and the serverless backend, so a suite proving what
 * they accept and reject must not live inside either consumer (it would
 * silently stop running if that consumer were restructured).
 *
 * No alias is needed — the tests sit beside the sources and import them by
 * relative path, the way every other consumer of this library ultimately does.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['libs/interfaces/src/**/*.test.ts'],
  },
});
