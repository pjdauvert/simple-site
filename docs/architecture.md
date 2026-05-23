# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, Material-UI (MUI) |
| Language | TypeScript (strict mode) |
| Validation | Zod — runtime schemas + type inference |
| Routing | React Router (dynamic, config-driven) |
| i18n | React Intl |
| Markdown | React Markdown |
| Build | Vite + Nx |
| Tests | Vitest |
| Linting | ESLint + Lefthook git hooks |
| Backend | Netlify Functions (TypeScript, NodeNext ESM) |
| Storage | Netlify Blobs |

## Monorepo Layout

```
.
├─ apps/
│  ├─ web/            # Vite React SPA
│  └─ functions/      # Netlify Functions
├─ libs/
│  └─ interfaces/     # Shared Zod schemas & TypeScript types
├─ docs/              # Project documentation
├─ netlify.toml       # Build config + /api/* → /.netlify/functions/* redirect
├─ package.json       # Nx scripts (dev / build / test / lint / typecheck)
└─ tsconfig.base.json # Path alias @simple-site/interfaces → libs/interfaces
```

npm scripts delegate to Nx targets. Run `npm run dev`, `npm run build`, `npm test`, etc.

## Shared Interfaces (`libs/interfaces`)

All contracts shared between the frontend and the serverless functions live in `libs/interfaces` and are imported via the `@simple-site/interfaces` alias:

- Zod schemas for `SiteConfig` (site metadata, themes, pages, sections)
- Zod schemas for `I18n` (locale dictionaries)
- Section discriminated unions that drive type-safe rendering
- API response envelope types (`ApiResponseSuccessPayload`, `ApiResponseErrorPayload`)
- Shared `ErrorCode` enum for server-side error categorisation

Because the functions compile to native NodeNext ESM, the library re-exports every file with explicit `.js` extensions so the emitted JavaScript resolves correctly in Node without bundling.

## Runtime Configuration Flow

Configuration and translations are fetched from the serverless API at startup — there is no static config file bundled with the frontend.

```
┌──────────────────────────────────────────────────┐
│  App starts                                      │
│  ↓                                               │
│  SiteConfigProvider                              │
│  ↓  (shows loading screen)                       │
│  GET /api/config → Zod (SiteConfigSchema)        │
│  ↓                                               │
│  Config in React Context                         │
│  ├─ ThemeProvider  (config.themes)               │
│  └─ AppRouter      (config.pages)                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  AppIntlProvider                                 │
│  (locale resolved from localStorage / browser)  │
│  ↓                                               │
│  GET /api/translations/:locale                   │
│    → Zod (I18nDictionarySchema)                  │
│  ↓                                               │
│  ReactIntlProvider with fetched messages         │
│  (re-fetches on every locale switch)             │
└──────────────────────────────────────────────────┘
```

Both fetches are validated by Zod; schema errors surface as a graceful error screen rather than a blank page.

## Mobile-First Responsive Design

The app uses MUI breakpoints with a mobile-first approach:

| Breakpoint | Width | Target |
|-----------|-------|--------|
| `xs` | 0 px+ | Phones |
| `sm` | 600 px+ | Large phones / small tablets |
| `md` | 900 px+ | Tablets |
| `lg` | 1200 px+ | Desktops |
| `xl` | 1536 px+ | Large desktops |

Responsive values are applied via the `sx` prop:

```typescript
sx={{
  fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
  padding:  { xs: 2,      sm: 3,         md: 4 },
}}
```
