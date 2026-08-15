import { fileURLToPath, URL } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const sharedTypesRoot = fileURLToPath(new URL('../../libs/interfaces/src', import.meta.url));

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
