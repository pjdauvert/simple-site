# Configuration

Site configuration and translations are stored in **Netlify Blobs** and fetched at runtime by the frontend — there is no static config file bundled with the built assets.

- Configuration: the **published** config is fetched via `GET /api/config`, validated against `SiteConfigSchema`
- Translations: fetched via `GET /api/translations/:locale`, validated against `I18nDictionarySchema`

Both blobs are seeded automatically on the first dev request from the JSON files in `apps/functions/src/handlers/seed/`.

Configuration is versioned with a **draft → publish** model — admins edit a draft and publish it to go live, with an archive history for rollback. See [Versioning](#versioning-draft--publish--archive) below.

---

## Site Configuration

### Schema

```json
{
  "site": {
    "siteName": "string (required)",
    "logoUrl": "string (optional)",
    "faviconUrl": "string (optional)",
    "containerMaxWidth": "'xs'|'sm'|'md'|'lg'|'xl'|false (optional)",
    "defaultLanguage": "BCP-47 locale code (optional, defaults to 'en')"
  },
  "themes": [ /* one or more ThemeConfig objects — see Themes below */ ],
  "pages":  [ /* one or more PageConfiguration objects — see Pages below */ ]
}
```

`defaultLanguage` is the site's **default language** — the language the config's own text (section content, menu titles) is written in. It is validated as an Intl-resolvable BCP-47 code (`en`, `fr-CA`, `zh-Hant`, …) and Zod-defaults to `en`, so legacy configs without the field keep working unchanged. It is meant to be **set once at setup** (in the seed / imported config): there is deliberately no in-app control to change it, since flipping it would re-interpret every config text as a different language. See [Translations](#translations) below for how it interacts with the translations blob.

The `site` section is editable from the **General** tab of the `/manage/site` configuration page, which saves via `PUT /api/config/site` (see [api.md](./api.md)); `logoUrl` / `faviconUrl` can be picked from the Media library when that feature is enabled (`defaultLanguage` is not exposed in the form — it is carried through saves unchanged). The `themes` array is editable from the **Themes** tab there (add / edit / delete), which saves via `PUT /api/config/themes`. `pages` are edited from the **Pages** tab — a page & section editor (add/remove/reorder pages and sections, edit one section at a time with a live preview, import/export pages as JSON) — which saves the whole draft via `POST /api/config`.

### Themes

Each theme object:

```json
{
  "themeName": "Dark",
  "primaryColor": "#90caf9",
  "secondaryColor": "#f48fb1",
  "linkColor": "#90caf9",
  "linkHoverColor": "#64b5f6",
  "textColor": "#ffffff",
  "backgroundColor": "#121212",
  "menuBackgroundColor": "#1e1e1e",
  "menuTextColor": "#ffffff",
  "menuHoverColor": "#2c2c2c"
}
```

The theme will be validated by Zod and automatically appear in the theme switcher. Rules:
- `textColor` (optional) sets the default body/content text color. If omitted, MUI's default for the theme mode is used. Individual sections can still override it via their own `textColor`.
- `menuTextColor` (optional) sets the menu bar text and icon color (site title, nav links, action icons). If omitted, it falls back to `textColor`, then to the MUI default. Set it explicitly to ensure the menu contrasts with `menuBackgroundColor`.
- All other fields are required.
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
- Both `route` and `pageName` must be **unique across all pages**. This is enforced by `SiteConfigSchema` itself, so it holds both in the admin **Pages** editor (form validation) and at the API — `POST /api/config` rejects a config with duplicates.
- The home page (`route: "/home"`) is reserved: the Pages editor won't let you delete it or change its `route` / `pageName`.

### Sections

Sections are typed via a Zod discriminated union on the `type` field. Currently supported types: `hero`, `text`.

**Hero section:** (all fields optional except each item's own required keys — see `HeroSectionPropsSchema` in `libs/interfaces`)
```json
{
  "sectionName": "hero",
  "type": "hero",
  "content": {
    "title": "string",
    "subtitle": "string",
    "ctaButtons": [{ "label": "string", "link": "string", "variant": "contained | outlined | text" }],
    "featuringItems": [{ "label": "string", "value": "string" }]
  },
  "design": {
    "backgroundColor": "string",
    "textColor": "string",
    "backgroundUrl": "url or path (section background image)",
    "layout": "centered | split",
    "columnLayout": [1.1, 1],
    "artworkSide": "left | right",
    "artwork": { "imageUrl": "url or path", "alt": "string", "verticalAlign": "…", "horizontalAlign": "…" }
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

### Versioning (draft → publish → archive)

The whole `SiteConfig` (site + themes + pages) is versioned. There is exactly one **published** (live) config, an optional working **draft**, and a linear history of **archives**. Translations are *not* part of this versioning.

- **Edit** — the admin panels on `/manage` (e.g. Site settings, Themes) write to the **draft** (`PUT /api/config/site`, `PUT /api/config/themes`, `POST /api/config`). Nothing changes on the live site until you publish. There is at most one draft, and a draft blob exists only while there are unpublished changes.
- **Start from a version** — with no draft, an archive (or the published config) can be used as the starting point for a new draft (`POST /api/config/versions/:key/draft`), cloning its content. Importing (`POST /api/config/import`) does the same from an uploaded file. If a draft already exists, it is **archived first** so its work is never discarded.
- **Publish** — `POST /api/config/publish` promotes the draft to live (the published version keeps the draft's name). The **previously-published** config is snapshotted into an archive keyed by a UTC, second-precision timestamp (`config:archive:<YYYYMMDDHHMMSS>`), keeping the name it had while published, and the draft is cleared.
- **Archive history** — archives are listed newest-first and are read-only snapshots; delete them manually when no longer needed. Retention is capped at **10 versions** (published + archives; the draft is uncounted). When a new archive is created at the cap, the archive with the **oldest `createdAt`** is erased — the admin panel confirms first and offers to download it (Cancel / Confirm / Download & confirm).
- **Roll back** — re-publishing an archive (`POST /api/config/versions/:key/publish`) makes it live again and archives the config it replaced.
- **Name / rename** — every version (published, draft, archive) has a name, defaulting to `version_<YYYYMMDDHHMMSS>` (UTC creation time) and editable via `PUT /api/config/versions/:key`.
- **Import / export** — download any version's JSON (`GET /api/config/versions/:key`) or upload one as a new named draft (`POST /api/config/import`).

The **Config versions** panel on the `/manage` dashboard drives all of the above. See the [API reference](api.md#get-apiconfig) for the endpoints and the blob-key layout.

### Updating the live configuration

For local development, edit `apps/functions/src/handlers/seed/siteConfig.json` directly — it seeds the **published** config on the next request if the blob is absent. In a running environment, use the **Config versions** panel (or the API): edit the draft, then publish.

```bash
# Replace the DRAFT (does not go live until published)
curl -X POST https://<your-site>/api/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <netlify-identity-token>" \
  -d @apps/functions/src/handlers/seed/siteConfig.json

# Publish the draft to make it live
curl -X POST https://<your-site>/api/config/publish \
  -H "Authorization: Bearer <netlify-identity-token>"
```

---

## Translations

Translations live in a separate Netlify Blobs entry, seeded from `apps/functions/src/handlers/seed/i18n.json`. The blob holds **override languages only**: the default language (`config.site.defaultLanguage`) never has a dictionary, because its text *is* the site configuration — the content values the config defines are the default-language messages. Any stored dictionary for the default language is lazily stripped by the API (idempotent migration), so older blobs converge automatically.

The frontend fetches the active locale's dictionary via `GET /api/translations/:locale` on startup and re-fetches whenever the user switches language (the default language returns `{}` — no overlay needed). React Intl falls back to the content values defined in the site configuration if a key is missing **or empty** (empty translations are dropped from the overlay so a not-yet-translated key shows its config original instead of blank).

### Supported locales

Languages are **data-driven**: the set of offered languages is the config's default language plus the keys of the stored translations blob, discovered at runtime (`GET /api/translations` returns `{ defaultLanguage, translations }`). Any Intl-resolvable **BCP-47** code is accepted — region and script variants included (`fr-CA`, `zh-Hant`) — validated and canonicalized by `toCanonicalLocale` / `isLocaleCode` in `libs/interfaces/src/i18n.interface.ts` (`fr-ca` is stored as `fr-CA`; unresolvable codes like `xx` are rejected). The default language is the fallback for an unknown saved/browser locale — resolution tries an exact match, then a language-subtag match (`fr-BE` → `fr`), then the config default — and is not removable; the language switcher (public site and `/manage`) lists it with a "Default" chip. `I18nLocalesEnum` is now only the bundled seed defaults, not a hard gate. Add / import / remove override languages from the **Translations** page under `/manage` (no code change required).

### Key format

Translation keys are derived from the page / section structure:

```
{pageName}.{sectionName}.content.{field}
```

Examples:
- `page.home.hero.content.title`
- `page.home.hero.content.subtitle`
- `page.home.text.content.columns.0.title` (text section with columns)

Keys are derived from the config by a single shared helper (`collectI18nEntries` / the `menuTitleKey` + `sectionContentKey` builders in `libs/interfaces/src/i18n.keys.ts`), which the public renderers and the admin editor both use — so they can't drift.

### Adding or updating translations

**Default language** — its text is not managed here at all: edit it inline on the **Pages** tab (the config values *are* the default-language messages). The Translations page edits **overrides** only — the default language never appears in its language selector, though each key shows its config original alongside for reference.

**Translations page (`/manage/translations`)** — the recommended path for override languages. Pick a language and edit values inline. The editor cross-references the config: keys the site needs but that aren't translated show as **missing** (error), keys present in the blob but not referenced by the config show as **extra** (warning). You can **add** a language (any Intl-resolvable BCP-47 code, validated live as you type; generates every config key empty, ready to fill), **import** an `i18n.json`-shaped file (one or more languages at once; a default-language entry is skipped), or **remove** a language (the default excepted, and the last remaining override is protected). Saving replaces that language's dictionary (`PUT /api/translations/:locale`). The page accepts a `?key=<encoded full key>` deep link that prefills the filter and scrolls to / highlights that key — the inline text/markdown fields in the Pages editor open it via their floating **Translate** button.

**Local dev** — edit `apps/functions/src/handlers/seed/i18n.json` (override languages only — no default-language dictionary).

**Live (scripted)** — POST only the keys that changed (existing keys not included in the body are preserved). Targeting the default language returns `409`:

```bash
curl -X POST https://<your-site>/api/translations/fr \
  -H "Content-Type: application/json" \
  -d '{
    "page.home.hero.content.title": "Bienvenue sur notre site",
    "page.home.hero.content.subtitle": "Application React moderne"
  }'
```
