import { fileURLToPath, URL } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const sharedTypesRoot = fileURLToPath(new URL('../../libs/interfaces/src', import.meta.url));

// Pin a NON-UTC timezone (unless the machine already has one): on a UTC
// runner local == UTC, so a local/UTC confusion in date handling (the events
// classification, the datetime-local converters) could never fail a test.
process.env.TZ ??= 'Europe/Paris';

export default defineConfig({
  plugins: [react()] as any,
  resolve: {
    alias: {
      '@simple-site/interfaces': sharedTypesRoot,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // `netlify dev` continuously re-bundles functions (tests included) under
    // .netlify/functions-serve — never pick those artifacts up as web tests.
    exclude: [...configDefaults.exclude, '**/.netlify/**'],
    setupFiles: './src/test/setup.ts',
    env: {
      VITE_AUTH_BYPASS: 'false',
    },
  },
});
