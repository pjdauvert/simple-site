import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
const sharedTypesRoot = fileURLToPath(new URL('../../libs/interfaces/src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@simple-site/interfaces': sharedTypesRoot,
    },
  },
  server: {
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
              id.includes('node_modules/unified') ||
              id.includes('node_modules/micromark') ||
              id.includes('node_modules/hast-') ||
              id.includes('node_modules/mdast-') ||
              id.includes('node_modules/unist-')) {
            return 'markdown-vendor';
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
});
