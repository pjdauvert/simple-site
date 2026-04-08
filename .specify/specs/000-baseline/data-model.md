# Data Model: Simple Site — Baseline (Post-API Refactor)

## Entity Relationship Diagram

```mermaid
ERD
  SiteConfig { 
    SiteThemeConfig site
    ThemeConfig[] themes
    PageConfiguration[] pages
    I18nSchema i18n
  }

  PageConfiguration { 
    string pageName
    string menuTitle
    string route
    SectionProps[] sections
  }

  SectionProps { 
    string sectionName
    string type
    object content
    object design
  }

  ThemeConfig { 
    string themeName
    string primaryColor
    string secondaryColor
    string linkColor
    string linkHoverColor
    string backgroundColor
    string menuBackgroundColor
    string menuHoverColor
  }

  SiteThemeConfig { 
    string siteName
    UrlOrPath? logoUrl
    UrlOrPath? faviconUrl
    Breakpoint|false? containerMaxWidth
  }

  I18nSchema { 
    Locale locale : Map<string, string>
  }

  ApiRequest { 
    string method
    string path
    object body?
    Map<string, string>? headers
    Map<string, string>? query
  }

  ApiResponse { 
    number statusCode
    object payload?
    ApiError? error?
    Map<string, string>? headers
  }

  ApiError { 
    ErrorCode code
    string message
    object? details
    string timestamp
    string? path
  }

  SiteConfig ||--o{ PageConfiguration : pages
  SiteConfig ||--o{ ThemeConfig : themes
  SiteConfig ||--|{ I18nSchema : i18n

  ApiRequest ||--o{ SiteConfig : POST /api/config body
  ApiResponse ||--o{ SiteConfig : GET /api/config payload
  ApiRequest ||--o{ I18nSchema : POST /api/translations body
  ApiResponse ||--o{ I18nSchema : GET /api/translations payload

  PageConfiguration ||--o{ SectionProps : sections

  SectionProps { type: "hero" } --|> SectionProps
  SectionProps { type: "text" } --|> SectionProps
```

## Enums

| Enum | Values | Source |
|------|--------|--------|
| `SectionTypesEnum` | `hero`, `text` | `section.interface.ts` |
| `I18nLocalesEnum` | `en`, `fr` | `i18n.interface.ts` |
| `BreakpointsEnum` | `xs`, `sm`, `md`, `lg`, `xl` | `layout.interface.ts` |
| `MediaPositionEnum` | `cover`, `contain` | `layout.interface.ts` |
| `VerticalAlignEnum` | `top`, `middle`, `bottom`, `stretch` | `layout.interface.ts` |
| `HorizontalAlignEnum` | `left`, `center`, `right`, `span` | `layout.interface.ts` |
| `ErrorCode` | `UNAUTHORIZED`, `INVALID_TOKEN`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, `INTERNAL_ERROR`, etc. | `error.ts` |

## API Payloads

### `GET /api/config` → `ApiResponse<SiteConfig>`
Returns the full `SiteConfig` object.

### `POST /api/config` ← Request Body `ApiRequest<SiteConfig>`
Accepts a `SiteConfig` object. Stored as JSON in Netlify Blobs. Validated client-side.

### `GET /api/translations?lang={locale}` → `ApiResponse<Record<string, string>>`
Returns the translation dictionary for the specified `locale`.

### `POST /api/translations?lang={locale}` ← Request Body `ApiRequest<Record<string, string>>`
Accepts a translation dictionary for the specified `locale`. Stored as JSON in Netlify Blobs.

### `ApiRequest` (Generic Structure)
```typescript
interface ApiRequest<T = unknown> {
  method: string;
  path: string;
  body?: T; // Generic type for request body
  headers?: Record<string, string>;
  query?: Record<string, string>;
}
```

### `ApiResponse` (Generic Structure)
```typescript
interface ApiResponse<T = unknown> {
  statusCode: number;
  payload?: T; // Generic type for success payload
  error?: ApiError;
  headers?: Record<string, string>;
}
```

### `ApiError` (Standardized Error Structure)
```typescript
interface ApiError {
  code: ErrorCode;      // e.g., "NOT_FOUND", "INVALID_REQUEST"
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;    // ISO 8601
  path?: string;
}
```

## Storage

| Store | Technology | Key | Value |
|-------|-----------|-----|-------|
| Site Config | Netlify Blobs | `simple-site-store:config` | JSON string of `SiteConfig` |
| i18n Resources | Netlify Blobs | `simple-site-store:i18n:{locale}` | JSON string of `Record<string, string>` |
| Default Seed Data | Static JSON files | `apps/functions/src/handlers/seed/siteConfig.json`, `i18n.json` | Default `SiteConfig` and `I18nSchema` |
| Theme selection | React state (ephemeral) | — | theme name string |
| Locale selection | React state (ephemeral) | — | locale string |

No persistent client-side storage for theme/locale. Initial data for Netlify Blobs is provided by static JSON files which are loaded and pushed to blobs via `seedBlob` if blobs are empty.
