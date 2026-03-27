# Simple Site Constitution

## Core Principles

### I. Configuration-Driven Architecture
Every visual element, page, section, and theme is defined in a single JSON configuration. The application is a generic renderer — business logic lives in the config, not in bespoke components. New pages and sections are added by extending the configuration schema and creating reusable components, never by hardcoding content.

### II. Type Safety End-to-End (NON-NEGOTIABLE)
All data structures are defined as Zod schemas in `libs/interfaces`. TypeScript types are **inferred** from Zod — never hand-written alongside schemas. Runtime validation via `SiteConfigSchema.parse()` is mandatory before any config enters the React tree. Discriminated unions on `type` drive section rendering; exhaustive switches must cover all variants.

### III. Mobile-First Responsive Design
Every component starts from `xs` and scales up. MUI's `sx` prop with breakpoint objects is the standard pattern. Touch targets ≥ 44×44px. No horizontal scroll on any breakpoint. Typography, spacing, and layout adapt per breakpoint — never desktop-down overrides.

### IV. Separation of Concerns (Monorepo Boundaries)
- `libs/interfaces` — Zod schemas + inferred types only. No React, no runtime logic.
- `apps/web` — React SPA. Imports from `@simple-site/interfaces` for types.
- `apps/functions` — Netlify serverless handlers. Imports from `@simple-site/interfaces` for validation.

Cross-boundary imports must go through the `@simple-site/interfaces` alias. Direct relative imports across app/lib boundaries are forbidden.

### V. Internationalization by Default
Every user-visible string uses `react-intl` `<FormattedMessage>` with a deterministic key derived from `{pageName}.{sectionName}.content.{field}`. Fallback text comes from the config JSON. New locales are added to the `i18n` map — no code changes required for translation additions.

### VI. Section Extensibility Pattern
Adding a new section type follows a strict 7-step recipe (documented in README):
1. Add to `SectionTypesEnum`
2. Define Zod content + design schemas
3. Create section props schema extending `BaseSectionPropsSchema`
4. Update discriminated union + conditional type in `page.interface.ts`
5. Create lazy-loaded React component
6. Add case to `PageSection.tsx` switch
7. Add config + translations

Skipping steps breaks type safety or runtime validation.

### VII. Lazy Loading & Performance
Section components are lazy-loaded via `React.lazy()` + `Suspense`. Vendor chunks are manually split in Vite config (react-vendor, mui-vendor, intl-vendor, markdown-vendor). Images use ImageKit transformations for responsive sizing. No blocking resources in the critical render path.

### VIII. Serverless Backend Convention
Netlify Functions in `apps/functions` follow the pattern: Zod-validated input → handler logic → standardized `ApiErrorResponse` or `createSuccessResponse`. All handlers are wrapped in `withErrorHandler`. Environment variables are validated at function startup.

### IX. Testing Standards
- Unit tests via Vitest + React Testing Library
- Schema validation tests are mandatory for any new Zod schema
- Tests must be collocated with the module they test (`.test.ts` suffix)
- No snapshot tests — prefer behavioral assertions

### X. Simplicity & YAGNI
Start simple. No state management library beyond React Context. No ORM. No CSS-in-JS beyond MUI's `sx`. If a library adds more complexity than it saves, don't add it. Justify every new dependency.

## Deployment

- **Hosting**: Netlify (static site + functions)
- **Build**: `nx run-many -t build --projects=web,functions`
- **Static output**: `dist/apps/web`
- **Functions output**: `dist/apps/functions`
- **API routing**: `/api/*` → Netlify Functions via redirect rule

## Governance

This constitution supersedes ad-hoc decisions. Amendments require:
1. Documentation of the change and rationale
2. Update to this file
3. Review of existing code for compliance

**Version**: 1.0.0 | **Ratified**: 2026-03-27 | **Last Amended**: 2026-03-27
