# Configuration

Site configuration and translations are stored in **Netlify Blobs** and fetched at runtime by the frontend — there is no static config file bundled with the built assets.

- Configuration: fetched via `GET /api/config`, validated against `SiteConfigSchema`
- Translations: fetched via `GET /api/translations/:locale`, validated against `I18nDictionarySchema`

Both blobs are seeded automatically on the first dev request from the JSON files in `apps/functions/src/handlers/seed/`.

---

## Site Configuration

### Schema

```json
{
  "site": {
    "siteName": "string (required)",
    "logoUrl": "string (optional)",
    "faviconUrl": "string (optional)",
    "containerMaxWidth": "'xs'|'sm'|'md'|'lg'|'xl'|false (optional)"
  },
  "themes": [ /* one or more ThemeConfig objects — see Themes below */ ],
  "pages":  [ /* one or more PageConfiguration objects — see Pages below */ ]
}
```

### Themes

Each theme object:

```json
{
  "themeName": "Dark",
  "primaryColor": "#90caf9",
  "secondaryColor": "#f48fb1",
  "linkColor": "#90caf9",
  "linkHoverColor": "#64b5f6",
  "backgroundColor": "#121212",
  "menuBackgroundColor": "#1e1e1e",
  "menuHoverColor": "#2c2c2c"
}
```

All fields are required. The theme will be validated by Zod and automatically appear in the theme switcher. Rules:
- If no theme is provided, a hardcoded default is used.
- If only one theme is provided, the theme switcher is hidden.

### Pages

Each page object:

```json
{
  "pageName": "page.home",
  "menuTitle": "Home",
  "route": "/",
  "sections": [ /* array of section objects */ ]
}
```

- `pageName` is used as the prefix for all i18n keys on that page (e.g. `page.home.hero.content.title`).
- `route` must be unique. Routes are registered automatically — no router changes needed.

### Sections

Sections are typed via a Zod discriminated union on the `type` field. Currently supported types: `hero`, `text`.

**Hero section:**
```json
{
  "sectionName": "hero",
  "type": "hero",
  "content": {
    "title": "string (optional)",
    "subtitle": "string (optional)",
    "ctaLabel": "string (optional)",
    "ctaLink": "string (optional)"
  },
  "design": {
    "backgroundColor": "string (optional)",
    "textColor": "string (optional)",
    "imageUrl": "string (optional)",
    "videoUrl": "string (optional)",
    "parallax": "boolean (optional)"
  }
}
```

**Text section:**
```json
{
  "sectionName": "text",
  "type": "text",
  "content": {
    "columns": [
      { "title": "string (optional)", "paragraph": "string (optional)" }
    ]
  },
  "design": { /* see TextDesignSchema in libs/interfaces */ }
}
```

### Updating the live configuration

```bash
curl -X POST https://<your-site>/api/config \
  -H "Content-Type: application/json" \
  -d @apps/functions/src/handlers/seed/siteConfig.json
```

For local development, edit `apps/functions/src/handlers/seed/siteConfig.json` directly — it is re-seeded on the next request if the blob is absent.

---

## Translations

Translations live in a separate Netlify Blobs entry, seeded from `apps/functions/src/handlers/seed/i18n.json`.

The frontend fetches the active locale's dictionary via `GET /api/translations/:locale` on startup and re-fetches whenever the user switches language. React Intl falls back to the content values defined in the site configuration if a key is missing.

### Supported locales

`en`, `fr`. Adding a new locale requires extending `I18nLocalesEnum` in `libs/interfaces/src/i18n.interface.ts`.

### Key format

Translation keys are derived from the page / section structure:

```
{pageName}.{sectionName}.content.{field}
```

Examples:
- `page.home.hero.content.title`
- `page.home.hero.content.subtitle`
- `page.home.text.content.columns.0.title` (text section with columns)

### Adding or updating translations

**Local dev** — edit `apps/functions/src/handlers/seed/i18n.json`.

**Live** — POST only the keys that changed (existing keys not included in the body are preserved):

```bash
curl -X POST https://<your-site>/api/translations/en \
  -H "Content-Type: application/json" \
  -d '{
    "page.home.hero.content.title": "Welcome to Our Site",
    "page.home.hero.content.subtitle": "Modern React Application"
  }'
```
