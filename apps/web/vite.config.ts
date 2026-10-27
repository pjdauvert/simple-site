import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const sharedTypesRoot = fileURLToPath(new URL('../../libs/interfaces/src', import.meta.url));

/** Where `netlify.toml` tells the emulator to find the API (a BUILD, not sources). */
const functionsDir = fileURLToPath(new URL('../../dist/apps/functions', import.meta.url));

/**
 * `/api/*` is served by the serverless FUNCTIONS BUILD, and a missing
 * `dist/apps/functions` makes every API call fall through to the SPA — the app
 * then renders nothing but "Error Loading Configuration", with no hint as to
 * why. `npm run dev` builds them first (see `apps/web/project.json`), so this
 * only fires for a bare `vite`, which it also warns is the wrong entry point:
 * Vite alone cannot route `/api/*` (the Netlify config lives at the workspace
 * root, outside Vite's root), so the API needs `npm run dev`.
 */
const netlifyFunctionsNotice = (): import('vite').Plugin => ({
  name: 'netlify-functions-notice',
  apply: 'serve',
  configureServer(server) {
    const printUrls = server.printUrls.bind(server);
    server.printUrls = () => {
      printUrls();
      const built = existsSync(functionsDir)
        ? readdirSync(functionsDir).filter((entry) => entry.endsWith('.mjs'))
        : [];
      if (built.length === 0) {
        server.config.logger.warn(
          '\n  !  No functions build in dist/apps/functions — /api/* will fall through to the\n' +
            '     SPA and the app will only show "Error Loading Configuration".\n' +
            '     Run `npm run dev` (it builds them and serves the API through Netlify).\n',
        );
      } else if (!process.env.NETLIFY_DEV) {
        server.config.logger.warn(
          '\n  !  Vite alone does not route /api/* — the Netlify config lives at the workspace\n' +
            '     root, outside Vite\'s root. Use `npm run dev` for the app AND the API.\n',
        );
      }
    };
  },
});

const netlifyRedirectsPlugin = (): import('vite').Plugin => ({
  name: 'netlify-spa-redirects',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: '_redirects',
      source: '/*    /index.html    200\n',
    });
  },
});

/**
 * Hostnames a reverse proxy may front the dev server with, comma-separated in
 * `DEV_ALLOWED_HOSTS` (workspace `.env`). Vite rejects any `Host` it was not
 * told about, so serving `npm run dev` behind nginx (or a tunnel) answers
 * "Blocked request" until its hostname is listed. Empty — the default — keeps
 * Vite's own strict behaviour, which is what a laptop on a café network wants.
 */
const allowedHosts = (mode: string): string[] =>
  (loadEnv(mode, workspaceRoot, '').DEV_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

export default defineConfig(({ mode }) => ({
  plugins: [react(), netlify(), netlifyFunctionsNotice(), netlifyRedirectsPlugin()],
  resolve: {
    alias: {
      '@simple-site/interfaces': sharedTypesRoot,
    },
  },
  server: {
    allowedHosts: allowedHosts(mode),
    fs: {
      allow: [workspaceRoot],
    },
  },
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy optimized for React 19
        manualChunks: (id) => {
          // React core libraries - must be together for React 19
          // Keep react, react-dom, and scheduler together to avoid loading issues
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // React Router - separate from core React
          if (id.includes('node_modules/react-router-dom') || 
              id.includes('node_modules/react-router')) {
            return 'react-router-vendor';
          }
          
          // Date pickers + dayjs — only the lazy admin dialogs and the lazy
          // `/events/search` filters use them. MUST stay BEFORE the `@mui` rule:
          // merged into `mui-vendor` (which the public entry imports) the lazy
          // routers would buy nothing.
          if (id.includes('node_modules/@mui/x-date-pickers') ||
              id.includes('node_modules/dayjs')) {
            return 'date-pickers-vendor';
          }

          // Material-UI - large UI library, separate chunk
          if (id.includes('node_modules/@mui') || 
              id.includes('node_modules/@emotion')) {
            return 'mui-vendor';
          }
          
          // React Intl - internationalization
          if (id.includes('node_modules/react-intl') || 
              id.includes('node_modules/@formatjs') ||
              id.includes('node_modules/intl-messageformat')) {
            return 'intl-vendor';
          }
          
          // React Markdown and dependencies
          if (id.includes('node_modules/react-markdown') ||
              id.includes('node_modules/remark-') ||
              id.includes('node_modules/rehype-') ||
              id.includes('node_modules/unified/') ||
              id.includes('node_modules/micromark') ||
              id.includes('node_modules/hast-') ||
              id.includes('node_modules/mdast-') ||
              id.includes('node_modules/unist-util-') ||
              id.includes('node_modules/vfile') ||
              id.includes('node_modules/bail') ||
              id.includes('node_modules/trough') ||
              id.includes('node_modules/devlop') ||
              id.includes('node_modules/decode-named-character-reference') ||
              id.includes('node_modules/character-entities') ||
              id.includes('node_modules/property-information') ||
              id.includes('node_modules/web-namespaces')) {
            return 'markdown-vendor';
          }
          
          // Lexical rich-text editor — admin-only, imported lazily by the section
          // Markdown editor, so keep it in its own chunk out of the eager `vendor`
          // bundle (the public site never loads it).
          if (id.includes('node_modules/lexical/') || id.includes('node_modules/@lexical/')) {
            return 'lexical-vendor';
          }

          // All other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit (we're splitting now)
    chunkSizeWarningLimit: 600,
    // Ensure proper module format for React 19
    target: 'es2020',
    modulePreload: {
      polyfill: true,
    },
  },
}));
