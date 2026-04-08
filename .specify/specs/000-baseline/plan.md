# Implementation Plan: Simple Site — Baseline (Post-API Refactor)

**Branch**: `docs/spec-kit-baseline` | **Date**: 2026-04-08 | **Spec**: `specs/000-baseline/spec.md`
**Input**: Feature specification from `/specs/000-baseline/spec.md`

## Summary

A config-driven, themable, multilingual React SPA deployed on Netlify. Pages and sections are defined in a single JSON configuration, validated at runtime via Zod, and rendered dynamically through a discriminated-union section system. A serverless Netlify Functions backend provides CRUD APIs for config and i18n management, backed by Netlify Blobs.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: React 19, MUI 6, react-intl 7, react-router-dom 7, react-markdown 10, Zod 4, `@netlify/functions`, `@netlify/blobs`  
**Storage**: Netlify Blobs (serverless KV) for `siteConfig` and `i18n` resources  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Modern browsers (ES2020+), Netlify hosting  
**Project Type**: Web application (SPA + serverless functions)  
**Build System**: Vite (web), tsc (functions), Nx (orchestration)  
**Performance Goals**: < 2s FMP on 3G, Lighthouse mobile ≥ 80, API latency < 200ms (p95)  
**Constraints**: No server-side rendering, no traditional database, no auth (yet) on public APIs  

## Constitution Check

| Principle | Status |
|-----------|--------|
| I. Configuration-Driven Architecture | ✅ All content fetched from API based on JSON config |
| II. Type Safety End-to-End | ✅ Zod schemas → inferred types, runtime validation on fetched data |
| III. Mobile-First Responsive | ✅ MUI sx prop with breakpoint objects throughout |
| IV. Separation of Concerns | ✅ libs/interfaces, apps/web, apps/functions, clean API boundary |
| V. Internationalization by Default | ✅ react-intl with deterministic keys, translations fetched from API |
| VI. Section Extensibility Pattern | ✅ 7-step recipe still applies, now with API integration |
| VII. Lazy Loading & Performance | ✅ React.lazy sections, manual chunk splitting, API caching opportunity |
| VIII. Serverless Backend Convention | ✅ withErrorHandler, modular handlers, standardized responses, Netlify Blobs |
| IX. Testing Standards | ✅ Vitest, API service tests added |
| X. Simplicity & YAGNI | ✅ React Context, minimal deps, justified API layer |

## Project Structure

### Documentation

```
.specify/
├── memory/
│   └── constitution.md          # Project principles
├── specs/
│   └── 000-baseline/
│       ├── spec.md             # This feature spec (retroactive, updated)
│       ├── plan.md             # This implementation plan (updated)
│       ├── data-model.md       # Data model (updated)
│       └── research.md         # Tech stack assessment + future enhancements (updated)
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
│   │       ├── config/               # Removed static siteConfig.json
│   │       ├── services/
│   │       │   ├── apiService.ts         # Generic API client for GET/POST
│   │       │   ├── apiService.test.ts    # Tests for apiService
│   │       │   ├── configService.ts      # Fetches SiteConfig via apiService
│   │       │   └── initService.ts        # Handles initial setup/seeding (e.g. Netlify Blobs)
│   │       ├── features/
│   │       │   ├── config/
│   │       │   │   ├── SiteConfigContext.ts   # React Context definition
│   │       │   │   └── SiteConfigProvider.tsx # Async loader from API with loading/error states
│   │       │   ├── theme/
│   │       │   │   ├── ThemeContext.ts         # Theme context type
│   │       │   │   ├── ThemeProvider.tsx       # MUI theme builder from config
│   │       │   │   └── ThemeSwitcher.tsx       # Theme dropdown (hidden if < 2 themes)
│   │       │   └── i18n/
│   │       │       ├── IntlContext.ts          # Locale context type
│   │       │       ├── IntlProvider.tsx        # react-intl wrapper, fetches translations from API
│   │       │       └── LanguageSwitcher.tsx    # Language dropdown
│   │       ├── hooks/
│   │       │   ├── useSiteConfig.ts   # Context accessor
│   │       │   ├── useTheme.ts        # Theme context accessor
│   │       │   └── useIntl.ts         # Intl context accessor
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
│       │   ├── config.mts             # Handles /api/config GET/POST with Netlify Blobs
│       │   ├── translations.mts       # Handles /api/translations GET/POST with Netlify Blobs
│       │   ├── handlers/
│   │   │       ├── BaseHandler.ts         # Generic handler interface and base class
│   │   │       ├── ConfigModule.ts        # Config API logic
│   │   │       ├── TranslationsModule.ts  # Translations API logic
│   │   │       └── responseHandler.ts     # Standardized success responses
│   │   ├── errors/
│   │   │   ├── error.ts           # ApiErrorResponse class + ErrorResponses factory
│   │   │   └── errorHandler.ts    # withErrorHandler HOF
│   │   ├── types/
│   │   │   └── server-types.ts    # RequestHandler type
│   │   └── handlers/seed/
│   │       ├── seedBlob.ts          # Utility to seed Netlify Blobs with default data
│   │       ├── i18n.json            # Default i18n seed data
│   │       └── siteConfig.json      # Default siteConfig seed data
│       ├── tsconfig.json
│       └── tsconfig.build.json
├── libs/
│   └── interfaces/                    # Shared Zod schemas + TypeScript types
│       ├── src/
│       │   ├── index.ts               # Barrel export
│       │   ├── site.interface.ts      # SiteConfigSchema (root)
│       │   ├── i18n.interface.ts      # I18nLocalesEnum, I18nSchema (updated for API)
│       │   ├── api.interface.ts       # New ApiRequest, ApiResponse types for functions
│       │   ├── page.interface.ts      # PageConfiguration, SectionProps discriminated union
│       │   ├── menu.interface.ts      # MenuItem
│       │   ├── theme.interface.ts     # ThemeConfig, SiteThemeConfig
│       │   ├── layout.interface.ts    # Breakpoints, MediaPosition, Alignment enums
│       │   ├── url.interface.ts       # UrlOrPathSchema (RFC 3986 + local paths)
│       │   └── contact.interface.ts   # ContactRequest/Response schemas
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

### 1. API-Driven Config & Translations
Both `siteConfig` and `i18n` resources are now fetched from dedicated Netlify Functions (`/api/config`, `/api/translations`). This centralizes data management, enables dynamic updates without redeploying the frontend, and lays the groundwork for a future admin UI. The trade-off is increased network overhead on initial load, mitigated by browser caching and future blob caching.

### 2. Modular Netlify Functions
Netlify Functions are organized into `handlers/` with `BaseHandler`, `ConfigModule`, `TranslationsModule`. This promotes reusability, testability, and clear separation of concerns for each API endpoint. Each module handles its own business logic and Netlify Blob interactions.

### 3. Netlify Blobs for Persistent Storage
`siteConfig` and `i18n` data are stored in Netlify Blobs, providing a simple, serverless key-value store. This eliminates the need for a separate database and aligns with Netlify's ecosystem. Initial data is seeded via `initService` on the frontend and `seedBlob` function on the backend if blobs are empty.

### 4. Client-Side API Service
A new `apiService.ts` centralizes all API calls from the frontend, providing a consistent interface for `GET` and `POST` requests. This decouples components from direct fetch calls and simplifies error handling.

### 5. Removed Static Config File
The static `apps/web/src/config/siteConfig.json` is removed from the frontend app and moved to `apps/functions/src/handlers/seed/siteConfig.json` to act as initial seed data for Netlify Blobs.

## Complexity Tracking

No constitution violations identified with the updated architecture.
