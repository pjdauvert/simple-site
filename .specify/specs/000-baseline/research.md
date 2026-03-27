# Research: Simple Site — Baseline

## Technology Stack Assessment

### React 19 (Current)
- Using latest React with improved performance and concurrent features
- `createRoot` API in use (correct for React 19)
- No React Server Components (not applicable for Vite SPA)
- React 19 requires ES2020+ browser targets — correctly set in `vite.config.ts`

### Zod 4 (Current)
- Using Zod 4 with `z.prettifyError()` in error handler (Zod 4 feature)
- `z.email()` used in contact schema (Zod 4 sugar for `z.string().email()`)
- Discriminated unions work correctly for section type system
- **Note**: `z.enum()` with `Object.values()` requires a const assertion on the source enum — verified working

### MUI 6 (Current)
- Using Grid2 component (`@mui/material/Grid2`) — new in MUI 6
- `CssBaseline` for CSS reset
- `sx` prop is the primary styling mechanism
- `slotProps` API used in ThemeSwitcher (MUI 6 pattern, replaces `componentsProps`)

### react-router-dom 7 (Current)
- `createBrowserRouter` + `RouterProvider` pattern (data router API)
- Routes generated dynamically from config at runtime
- `useMemo` ensures router isn't recreated on every render

### react-intl 7 (Current)
- `<FormattedMessage>` with `id` + `defaultMessage` pattern
- Messages embedded in config JSON, not separate message files
- No async message loading — all translations loaded with config

### react-markdown 10 (Current)
- Used for rendering paragraph content in TextSection
- Wrapped inside `<FormattedMessage>` children render pattern
- No custom remark/rehype plugins configured

### Netlify Functions v2 (Current)
- Using `Config` + `Context` types from `@netlify/functions`
- `getStore` from `@netlify/blobs` for KV storage
- Export `config` object for route configuration (Netlify v2 pattern)
- `withErrorHandler` HOF pattern for standardized error handling

### Vite (Build)
- Manual chunk splitting for vendor optimization
- Workspace root `fs.allow` for monorepo file access
- Module preload polyfill enabled
- ES2020 target matches React 19 requirements

### Nx (Orchestration)
- `useDaemonProcess: false` — lightweight, no background daemon
- Three projects: `web`, `functions`, `interfaces`
- `typecheck` depends on `interfaces:build` — correct dependency chain
- Cache enabled for build, test, lint targets

## Architecture Observations

### Strengths
1. **Clean separation**: Zod schemas in shared lib, React components in web, handlers in functions
2. **Type safety pipeline**: Zod → inferred types → runtime validation → React rendering
3. **Extensible section system**: Adding new section types follows a clear, documented pattern
4. **Performance-conscious**: Lazy loading, chunk splitting, ImageKit transformations
5. **i18n key convention**: Deterministic key construction eliminates key management burden

### Areas for Future Enhancement
1. **No persistence for user preferences**: Theme and locale reset on reload
2. **No auth on config API**: POST endpoint is unprotected
3. **Static i18n loading**: All translations loaded upfront; could be lazy per locale
4. **No SEO metadata**: No `<head>` management for titles, descriptions, og tags
5. **No contact form handler**: Schema exists but no function implements it
6. **No error boundary**: Config validation errors show but React errors would white-screen
7. **Config API doesn't validate**: POST stores raw JSON without Zod validation
8. **ImageKit coupling**: URL transformation logic is hardcoded for ImageKit's `?tr=` syntax
