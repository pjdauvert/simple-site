# Data Model: Simple Site — Baseline

## Entity Relationship Diagram

```
SiteConfig (root)
├── site: SiteThemeConfig
│   ├── siteName: string
│   ├── logoUrl?: UrlOrPath
│   ├── faviconUrl?: UrlOrPath
│   └── containerMaxWidth?: Breakpoint | false
│
├── themes: ThemeConfig[]
│   └── ThemeConfig
│       ├── themeName: string
│       ├── primaryColor: string
│       ├── secondaryColor: string
│       ├── linkColor: string
│       ├── linkHoverColor: string
│       ├── backgroundColor: string
│       ├── menuBackgroundColor: string
│       └── menuHoverColor: string
│
├── pages: PageConfiguration[]
│   └── PageConfiguration (extends MenuItem)
│       ├── pageName: string
│       ├── menuTitle: string
│       ├── route: string
│       └── sections: SectionProps[]  ← discriminated union on `type`
│           ├── HeroSectionProps (type: "hero")
│           │   ├── sectionName: string
│           │   ├── content
│           │   │   ├── title?: string
│           │   │   ├── subtitle?: string
│           │   │   ├── ctaLabel?: string
│           │   │   └── ctaLink?: string
│           │   └── design? (extends BaseSectionDesign)
│           │       ├── backgroundColor?: string
│           │       ├── textColor?: string
│           │       ├── imageUrl?: string
│           │       ├── videoUrl?: string
│           │       └── parallax?: boolean
│           │
│           └── TextSectionProps (type: "text")
│               ├── sectionName: string
│               ├── content
│               │   └── columns: TextColumnContent[] (1-4)
│               │       ├── title?: string
│               │       └── paragraph?: string
│               └── design? (extends BaseSectionDesign)
│                   ├── backgroundColor?: string
│                   ├── textColor?: string
│                   ├── columnLayout?: number[] (2-4 items)
│                   ├── columnConfig?: TextColumnDesign[]
│                   │   ├── hideOnBreakpoints?: Breakpoint[]
│                   │   ├── textHorizontalAlign?: HorizontalAlign
│                   │   ├── textVerticalAlign?: VerticalAlign
│                   │   └── media?
│                   │       ├── url: UrlOrPath
│                   │       ├── position?: "cover" | "contain"
│                   │       ├── verticalAlign?: VerticalAlign
│                   │       ├── horizontalAlign?: HorizontalAlign
│                   │       ├── maxWidth?: string
│                   │       └── maxHeight?: string
│                   ├── backgroundUrl?: UrlOrPath
│                   └── parallax?: boolean
│
└── i18n: Record<Locale, Record<string, string>>
    └── Locale: "en" | "fr"
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

## API Payloads

### GET /api/config → 200
Returns the raw JSON config string stored in Netlify Blobs.

### POST /api/config ← Request Body
Accepts a raw JSON string. Stored as-is in Netlify Blobs (no Zod validation on the server — validation happens client-side on load).

### Error Responses (all endpoints)

```typescript
{
  code: ErrorCode,      // e.g., "NOT_FOUND", "INVALID_REQUEST"
  message: string,
  details?: Record<string, unknown>,
  timestamp: string,    // ISO 8601
  path?: string
}
```

## Standalone Schemas (non-config)

### ContactRequest / ContactResponse
```
ContactRequest { name: string(1-100), email: email, message: string(1-5000) }
ContactResponse { ok: boolean }
```

Used by contact form handler (not yet implemented in current codebase but schema is defined).

## Storage

| Store | Technology | Key | Value |
|-------|-----------|-----|-------|
| Site Config (production) | Netlify Blobs | `simple-site-store/config` | JSON string |
| Site Config (dev) | Static import | `siteConfig.json` | JSON module |
| Theme selection | React state (ephemeral) | — | theme name string |
| Locale selection | React state (ephemeral) | — | locale string |

No persistent client-side storage. Theme and locale reset on page reload (future enhancement: localStorage).
