# Configuration

Site configuration, translations and the team are stored in **Netlify Blobs** and fetched at runtime by the frontend — there is no static config file bundled with the built assets.

- Configuration: the **published** config is fetched via `GET /api/config`, validated against `SiteConfigSchema`
- Translations: fetched via `GET /api/translations/:locale`, validated against `I18nDictionarySchema`
- Team (flag-gated): fetched via `GET /api/team`, validated against `TeamConfigSchema` — see [Team](#team)

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
  "pages":  [ /* one or more PageConfiguration objects — see Pages below */ ],
  "menu":   { /* optional MenuConfig — see Menu below */ }
}
```

`defaultLanguage` is the site's **default language** — the language the config's own text (section content, menu titles) is written in. It is validated as an Intl-resolvable BCP-47 code (`en`, `fr-CA`, `zh-Hant`, …) and Zod-defaults to `en`, so legacy configs without the field keep working unchanged. It is meant to be **set once at setup** (in the seed / imported config): there is deliberately no in-app control to change it, since flipping it would re-interpret every config text as a different language. See [Translations](#translations) below for how it interacts with the translations blob.

The `site` section is editable from the **General** tab of the `/manage/site` configuration page, which saves via `PUT /api/config/site` (see [api.md](./api.md)); `logoUrl` / `faviconUrl` can be picked from the Media library when that feature is enabled (`defaultLanguage` is not exposed in the form — it is carried through saves unchanged). The `themes` array is editable from the **Themes** tab there (add / edit / delete), which saves via `PUT /api/config/themes`. `pages` are edited from the **Pages** tab — a page & section editor (add/remove/reorder pages and sections, edit one section at a time with a live preview, import/export pages as JSON) — which saves the whole draft via `POST /api/config`. Navigation ordering and visibility live on the **Menu** tab, which saves via `PUT /api/config/menu`.

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
- Routes may not use a **feature-reserved route** (`/team`, or anything nested under one — see `FEATURE_PAGE_ROUTES` in `libs/interfaces/src/menu.interface.ts`). Feature pages own those URLs; the Pages editor and the API both reject them.
- The home page (`route: "/home"`) is reserved: the Pages editor won't let you delete it or change its `route` / `pageName`.

### Menu

The optional `menu` decouples the public navigation from the raw pages list. It is an **ordered list of entries referencing their target** — config pages by `pageName`, feature pages by id — so a page rename can never leave a stale copy of its title or route in the menu:

```json
{
  "entries": [
    { "type": "page", "pageName": "page.home", "visible": true, "menuTitle": "Welcome" },
    { "type": "feature", "feature": "team", "visible": false, "menuTitle": "Our team" }
  ]
}
```

- **Order** = navigation order. **`visible: false`** keeps the target reachable at its URL while hiding it from the nav.
- **`menuTitle`** (optional) renames the entry in the nav: for a page entry it overrides the page's own title (absent → the page's `menuTitle`); for a feature entry it is the label itself (absent → the feature's default, e.g. "Team"). Rename inline from the Menu tab; an emptied field reverts to the fallback. Like every config label it is a translation **default** — per-language values are managed on the **Translations** page under the `${pageName|feature}.menuTitle` key (menu labels are part of `collectI18nEntries`, so they appear there automatically).
- **Feature entries** point at pages shipped by optional features (`team` today; contact, gallery, events… later). They only render when the feature's flag is on; entries of disabled features are **kept in the data** (greyed out on the Menu tab) so flipping a flag never loses your ordering.
- **No `menu`** (older configs) → the nav derives from the pages array order, exactly as before the Menu tab existed.
- **Integrity** is enforced by `SiteConfigSchema`: no duplicate entries and no references to unknown pages can be stored.
- **Reconciliation** — the shared `reconcileMenu` helper keeps the menu in sync with the pages set: entries of deleted pages are pruned, new pages are appended (visible), and newly-enabled features are appended (hidden) until an admin opts them in. The Menu tab applies it on load; the Pages editor applies it on save. Note that renaming a `pageName` counts as delete + re-add, so that entry returns to the end of the menu with default visibility.

The **Menu** tab of `/manage/site` edits this: reorder with the up/down controls, rename with the pencil control, toggle visibility per entry, then save (`PUT /api/config/menu` — writes the draft; publish to go live).

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

Languages are **data-driven**: the set of offered languages is the config's default language plus the keys of the stored translations blob, discovered at runtime (`GET /api/translations` returns `{ defaultLanguage, translations }`). Any Intl-resolvable **BCP-47** code is accepted — region and script variants included (`fr-CA`, `zh-Hant`) — validated and canonicalized by `toCanonicalLocale` / `isLocaleCode` in `libs/interfaces/src/i18n.interface.ts` (`fr-ca` is stored as `fr-CA`; unresolvable codes like `xx` are rejected). The default language is the fallback for an unknown saved/browser locale — resolution tries an exact match, then a language-subtag match (`fr-BE` → `fr`), then the config default — and is not removable; the language switcher (public site and `/manage`) lists it alongside the override languages. `I18nLocalesEnum` is now only the bundled seed defaults, not a hard gate. Add / import / remove override languages from the **Translations** page under `/manage` (no code change required).

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

---

## Team

The team lives in its **own blob** (key `team`, seeded in dev from `apps/functions/src/handlers/seed/team.json`) behind the **`FEATURE_TEAM`** flag — when the flag is off, `/manage/team`, the public `/team*` pages and the whole `/api/team` surface behave as if they don't exist (404).

```json
{
  "members": [
    {
      "slug": "jane-doe",
      "name": "Jane Doe",
      "jobTitle": "Founder & CEO",
      "photoUrl": "/images/team/jane-doe.jpg",
      "biography": { "en": "markdown…", "fr": "markdown…" },
      "socialLinks": { "linkedin": "https://…", "website": "https://…" }
    }
  ],
  "alternateLayout": false
}
```

- **Direct save** — unlike the site configuration there is **no draft/publish step**: saving from `/manage/team` (`PUT /api/team`, whole-list replace) is live immediately. The editor says so explicitly.
- **`slug`** is the member's public URL identifier (`/team/member/<slug>`): lowercase kebab-case, unique across members, auto-derived from the name in the editor until edited by hand.
- **`biography`** is a per-locale record of markdown, stored **inside the member** — independent of the translations blob. The editor shows a language switch only when the platform offers more than one language; public rendering uses the active locale, falling back to the base locale, then to the first non-empty entry. `name`, `jobTitle` and `photoUrl` are language-neutral.
- **`socialLinks`** (optional) — supported networks: `linkedin`, `x`, `github`, `instagram`, `facebook`, `youtube`, `website` (see `SocialNetworksEnum` in `libs/interfaces/src/team.interface.ts`).
- **Array order** is the display order of the public team overview.
- **Public rendering** — `/team` shows the 404 page with no members and the single member's profile with exactly one. With several members it renders flat full-width rows (no panels): the identification block — circular photo (or initial avatar), name linking to the member page, job title, social icons — on one side and the full biography on the other. **`alternateLayout`** (toggle in the team editor) flips sides every other row on desktop; mobile always stacks one column, identification above biography. Unknown slugs 404. The single-member profile shows the circular photo with name and job title underneath, the biography in a card panel, and — only when links are provided — a centered row of social icons below it.
- The **menu** links to `/team` through a `{ "type": "feature", "feature": "team" }` entry (see [Menu](#menu)); the entry only renders while the flag is on.
