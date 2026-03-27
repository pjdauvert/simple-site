# Implementation Plan: Simple Site — Baseline

**Branch**: `main` | **Date**: 2026-03-27 | **Spec**: `specs/000-baseline/spec.md`

## Summary

A config-driven, themable, multilingual React SPA deployed on Netlify. Pages and sections are defined in a single JSON configuration, validated at runtime via Zod, and rendered dynamically through a discriminated-union section system. A serverless Netlify Functions backend provides a CRUD API for config management.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: React 19, MUI 6, react-intl 7, react-router-dom 7, react-markdown 10, Zod 4  
**Storage**: Netlify Blobs (serverless KV), JSON config file (static fallback)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Modern browsers (ES2020+), Netlify hosting  
**Project Type**: Web application (SPA + serverless functions)  
**Build System**: Vite (web), tsc (functions), Nx (orchestration)  
**Performance Goals**: < 2s FMP on 3G, Lighthouse mobile ≥ 80  
**Constraints**: No server-side rendering, no database, no auth (yet)  

## Constitution Check

| Principle | Status |
|-----------|--------|
| I. Configuration-Driven Architecture | ✅ All content in siteConfig.json |
| II. Type Safety End-to-End | ✅ Zod schemas → inferred types, runtime validation |
| III. Mobile-First Responsive | ✅ MUI sx prop with breakpoint objects throughout |
| IV. Separation of Concerns | ✅ libs/interfaces, apps/web, apps/functions |
| V. Internationalization by Default | ✅ react-intl with deterministic keys |
| VI. Section Extensibility Pattern | ✅ 7-step recipe documented, discriminated union |
| VII. Lazy Loading & Performance | ✅ React.lazy sections, manual chunk splitting |
| VIII. Serverless Backend Convention | ✅ withErrorHandler, standardized responses |
| IX. Testing Standards | ✅ Vitest, schema validation tests present |
| X. Simplicity & YAGNI | ✅ React Context only, minimal deps |

## Project Structure

### Documentation

```
.specify/
├── memory/
│   └── constitution.md        # Project principles
├── specs/
│   └── 000-baseline/
│       ├── spec.md             # This feature spec (retroactive)
│       └── plan.md             # This implementation plan
└── templates/                  # Spec-kit templates (if needed)
```

### Source Code

```
.
├── apps/
│   ├── web/                          # Vite React SPA
│   │   ├── index.html
│   │   ├── vite.config.ts            # Build config + chunk splitting
│   │   ├── vitest.config.ts          # Test config
│   │   └── src/
│   │       ├── main.tsx              # Entry point
│   │       ├── App.tsx               # Root: SiteConfigProvider → IntlProvider → ThemeProvider → Router
│   │       ├── config/
│   │       │   └── siteConfig.json   # THE config — all content, themes, pages, i18n
│   │       ├── services/
│   │       │   ├── configService.ts      # Async config loader + Zod validation
│   │       │   └── configService.test.ts # Schema validation tests
│   │       ├── features/
│   │       │   ├── config/
│   │       │   │   ├── SiteConfigContext.ts   # React Context definition
│   │       │   │   └── SiteConfigProvider.tsx # Async loader with loading/error states
│   │       │   ├── theme/
│   │       │   │   ├── ThemeContext.ts         # Theme context type
│   │       │   │   ├── ThemeProvider.tsx       # MUI theme builder from config
│   │       │   │   └── ThemeSwitcher.tsx       # Theme dropdown (hidden if < 2 themes)
│   │       │   └── i18n/
│   │       │       ├── IntlContext.ts          # Locale context type
│   │       │       ├── IntlProvider.tsx        # react-intl wrapper
│   │       │       └── LanguageSwitcher.tsx    # Language dropdown
│   │       ├── hooks/
│   │       │   ├── useSiteConfig.ts   # Context accessor
│   │       │   ├── useTheme.ts        # Theme context accessor
│   │       │   ├── useIntl.ts         # Intl context accessor
│   │       │   └── useFavicon.ts      # Dynamic favicon setter
│   │       ├── layouts/
│   │       │   ├── MainLayout.tsx     # AppBar + main + Footer
│   │       │   ├── MenuBar.tsx        # Responsive nav (desktop buttons + mobile hamburger)
│   │       │   └── Footer.tsx         # Copyright + license link
│   │       ├── router/
│   │       │   └── AppRouter.tsx      # Dynamic route generation from config.pages
│   │       ├── pages/
│   │       │   └── dynamic/
│   │       │       ├── Page.tsx       # Iterates sections, delegates to PageSection
│   │       │       └── PageSection.tsx # Discriminated-union switch + lazy loading
│   │       ├── components/
│   │       │   ├── index.ts
│   │       │   ├── Loading.tsx
│   │       │   └── sections/
│   │       │       ├── HeroSection.tsx  # Full-width hero with CTA
│   │       │       └── TextSection.tsx  # Multi-column with media, markdown, responsive hiding
│   │       ├── styles/
│   │       │   └── global.css
│   │       └── utils/
│   │           └── .gitkeep
│   └── functions/                     # Netlify Functions (serverless)
│       ├── src/
│       │   ├── config.mts             # GET/POST /api/config handler
│       │   ├── handlers/
│       │   │   ├── moduleHandler.ts   # Module env validation wrapper
│       │   │   └── responseHandler.ts # Standardized success/error responses
│       │   ├── errors/
│       │   │   ├── error.ts           # ApiErrorResponse class + ErrorResponses factory
│       │   │   └── errorHandler.ts    # withErrorHandler wrapper
│       │   └── types/
│       │       └── server-types.ts    # RequestHandler type
│       ├── tsconfig.json
│       └── tsconfig.build.json
├── libs/
│   └── interfaces/                    # Shared Zod schemas + TypeScript types
│       ├── src/
│       │   ├── index.ts               # Barrel export
│       │   ├── site.interface.ts      # SiteConfigSchema (root)
│       │   ├── page.interface.ts      # PageConfiguration, SectionProps discriminated union
│       │   ├── menu.interface.ts      # MenuItem
│       │   ├── theme.interface.ts     # ThemeConfig, SiteThemeConfig
│       │   ├── i18n.interface.ts      # I18nLocalesEnum, I18nSchema
│       │   ├── layout.interface.ts    # Breakpoints, MediaPosition, Alignment enums
│       │   ├── url.interface.ts       # UrlOrPathSchema (RFC 3986 + local paths)
│       │   ├── contact.interface.ts   # ContactRequest/Response schemas
│       │   └── sections/
│       │       ├── index.ts
│       │       ├── section.interface.ts     # BaseSectionPropsSchema, SectionTypesEnum
│       │       ├── hero.section.interface.ts # HeroSectionPropsSchema
│       │       └── text.section.interface.ts # TextSectionPropsSchema + column types
│       └── tsconfig.lib.json
├── nx.json                            # Nx workspace config
├── package.json                       # Scripts: dev, build, test, lint, typecheck
├── tsconfig.base.json                 # Path alias: @simple-site/interfaces
├── tsconfig.json                      # Root TS config
├── eslint.config.js                   # Flat ESLint config
├── lefthook.yml                       # Git hooks
└── netlify.toml                       # Build command + publish dir + API redirects
```

## Architecture Decisions

### 1. Single JSON Config
All site content, themes, pages, sections, and translations live in one `siteConfig.json`. This enables a future admin UI to manage the entire site by editing one blob. The trade-off is file size — acceptable for < 100 pages.

### 2. Discriminated Union Sections
Sections use `z.discriminatedUnion('type', [...])` enabling compile-time exhaustiveness checking and runtime Zod validation. Adding a section type requires updating the union — the compiler catches missing cases.

### 3. React Context over Redux/Zustand
Three contexts (config, theme, i18n) are sufficient for the current scope. No cross-cutting state management needed. Revisit if section count > 50 or deep nesting causes re-render issues.

### 4. Netlify Blobs for Config Storage
Simple KV store with no provisioning. Sufficient for single-tenant config management. Not suitable for multi-tenant or high-write workloads.

### 5. Chunk Splitting Strategy
Manual `manualChunks` in Vite config to separate React core, MUI, intl, and markdown into parallel-loadable chunks. This prevents a single monolithic vendor bundle.

## Complexity Tracking

No constitution violations identified.
