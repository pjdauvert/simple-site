# Research: Simple Site — Baseline (Post-API Refactor)

## Technology Stack Assessment

### React 19 (Current)
- Consistent usage with `createRoot` and functional components.
- No changes to core React usage.

### Zod 4 (Current)
- Continues to be used for runtime validation of fetched `SiteConfig` and `I18n` data.
- Zod schemas are also used for API request/response validation in Netlify Functions.

### MUI 6 (Current)
- No significant changes to MUI component usage or styling.

### react-router-dom 7 (Current)
- Router setup remains dynamic, but now depends on `SiteConfig` fetched from the API.

### react-intl 7 (Current)
- `<FormattedMessage>` pattern remains the same.
- **Change**: Message loading is now dynamic, fetching locale-specific translations from `/api/translations`.

### react-markdown 10 (Current)
- No changes.

### Netlify Functions v2 (Major Change)
- **New Architecture**: Replaced single `config.mts` with modular handlers (`BaseHandler`, `ConfigModule`, `TranslationsModule`).
- **API Endpoints**: Dedicated endpoints for `GET/POST /api/config` and `GET/POST /api/translations`.
- **Storage**: Now explicitly using `@netlify/blobs` for persistent storage of config and i18n data.
- **Error Handling**: `withErrorHandler` now wraps modular handlers, ensuring consistent API error responses.
- **Seed Data**: `seedBlob.ts` utility and `siteConfig.json`/`i18n.json` seed files provide initial data.

### Vite (Build)
- No significant changes.

### Nx (Orchestration)
- No significant changes.

## Architecture Observations

### Strengths (Updated)
1. **Clean separation**: Stronger separation with dedicated API layer for config/i18n.
2. **Type safety pipeline**: Zod validation extended to API request/response payloads.
3. **Extensible section system**: Still applies, now with API integration for dynamic data.
4. **Performance-conscious**: Lazy loading, chunk splitting, ImageKit. API caching (both browser and Netlify Blobs caching) can further improve performance.
5. **i18n key convention**: Deterministic keys remain, now with dynamic fetching.
6. **Centralized Data Management**: Configuration and translations can be updated via API without frontend redeployment.

### Areas for Future Enhancement (Updated)
1. **Persistence for user preferences**: Theme and locale still reset on reload (can be stored in local storage).
2. **Authentication for config/translations API**: POST endpoints are unprotected (critical for admin UI).
3. **Improved API caching**: Implement ETag/Last-Modified headers for API responses.
4. **SEO metadata**: Still no `<head>` management for titles, descriptions, og tags.
5. **Contact form handler**: Schema exists but no function implements it (and needs API integration).
6. **Error boundary**: Config validation errors show but React errors would white-screen (can add React error boundaries).
7. **ImageKit coupling**: URL transformation logic is hardcoded for ImageKit's `?tr=` syntax (can be abstracted).
8. **Initial Blob Seeding**: Currently relies on `initService` client-side or manual `seedBlob` function execution. Could be automated as part of Netlify deploy or CI.
