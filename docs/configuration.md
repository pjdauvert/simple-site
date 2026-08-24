# Configuration

Site configuration, translations, the team and the contact settings are stored in **Netlify Blobs** and fetched at runtime by the frontend — there is no static config file bundled with the built assets.

- Configuration: the **published** config is fetched via `GET /api/config`, validated against `StoredSiteConfigSchema` (the read-lenient variant of `SiteConfigSchema` — see the reserved-routes note under [Pages](#pages))
- Translations: fetched via `GET /api/translations/:locale`, validated against `I18nDictionarySchema`
- Team (flag-gated): fetched via `GET /api/team`, validated against `TeamConfigSchema` — see [Team](#team)
- Contact (flag-gated): fetched via `GET /api/contact`, validated against `ContactConfigSchema` — see [Contact](#contact)

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
  "menu":   { /* optional MenuConfig — see Menu below */ },
  "gallery": { /* optional GalleryConfig, flag-gated — see Gallery below */ }
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
- Routes may not use a **feature-reserved route** (`/team`, `/contact`, `/gallery`, `/events`, or anything nested under one — see `FEATURE_PAGE_ROUTES` in `libs/interfaces/src/menu.interface.ts`). Feature pages own those URLs; the Pages editor and the API both reject them. This rule applies to **writes only** (`SiteConfigSchema`): stored configs are read with the lenient `StoredSiteConfigSchema`, so a config page that predates a route becoming reserved (e.g. a hand-made `/contact` page from before the contact feature) keeps loading — rename its route from the Pages editor to resolve the collision.
- The home page (`route: "/home"`) is reserved: the Pages editor won't let you delete it or change its `route` / `pageName`.

### Menu

The optional `menu` decouples the public navigation from the raw pages list. It is an **ordered list of entries referencing their target** — config pages by `pageName`, feature pages by id — so a page rename can never leave a stale copy of its title or route in the menu:

```json
{
  "entries": [
    { "type": "page", "pageName": "page.home", "visible": true, "menuTitle": "Welcome" },
    { "type": "feature", "feature": "team", "visible": false, "menuTitle": "Our team" },
    { "type": "group", "groupId": "moreLinks", "menuTitle": "More links", "visible": true,
      "alwaysExpanded": false, "children": [
        { "type": "page", "pageName": "page.about", "visible": true },
        { "type": "feature", "feature": "contact", "visible": true }
      ] }
  ],
  "groupDisplay": "bar"
}
```

- **Order** = navigation order. **`visible: false`** keeps the target reachable at its URL while hiding it from the nav.
- **`menuTitle`** (optional) renames the entry in the nav: for a page entry it overrides the page's own title (absent → the page's `menuTitle`); for a feature entry it is the label itself (absent → the feature's default, e.g. "Team"). Rename inline from the Menu tab; an emptied field reverts to the fallback. Like every config label it is a translation **default** — per-language values are managed on the **Translations** page under the `${pageName|feature}.menuTitle` key (menu labels are part of `collectI18nEntries`, so they appear there automatically).
- **Feature entries** point at pages shipped by optional features (`team`, `contact`, `gallery` and `events` today). They only render when the feature's flag is on; entries of disabled features are **kept in the data** (greyed out on the Menu tab) so flipping a flag never loses your ordering.
- **The gallery entry's tag submenu** — the gallery feature entry carries an ordered `galleryTags: [{ "tag": "…", "visible": … }]` list covering **every** declared tag (see [Gallery](#gallery)). In the public nav, at least one **activated** tag whose collection has something displayable turns the entry into a one-level submenu: an *all items* link first (dedicated translatable label, key `gallery.all.menuTitle`, default "All items"), then the active collections in the menu's order, each labelled by its tag's `displayName` (key `gallery.tag.<tag>.menuTitle`). With no tag counting (none declared, all deactivated, or all empty) the entry stays a **plain `/gallery` link**. Because it carries its own submenu, the gallery entry can **never join a group** (schema-enforced — submenus cannot nest). The legacy standalone `{ "type": "galleryTag" }` entries are deprecated: still parsed, never rendered, and migrated onto the submenu by reconciliation.
- **Group entries** are one-level submenus: a non-navigable, translatable label whose `children` are page/feature entries. In the public nav, clicking a group opens a popover of its children on desktop, and an accordion inside the mobile menu (`alwaysExpanded: true` renders it as an always-open section header there instead; the flag has no effect on desktop). A **hidden group** hides its whole subtree; a group whose children all resolve away (hidden, pruned, or feature-off) is **omitted from the nav but kept in the config**. Depth is one level by construction — a group cannot contain a group.
- **`groupDisplay`** (optional, menu-wide) picks the desktop rendering of groups: `"popover"` (default — anchored dropdown) or `"bar"` — clicking a group slides a **secondary menu bar** out from under the main bar (overlaying the page, which never shifts) listing that group's children; clicking the group again, navigating, or Escape closes it. One setting for the whole menu keeps the navigation coherent; mobile always uses the accordion regardless.
  - `groupId` is a single camelCase segment (`^[a-z][a-zA-Z0-9]*$`), derived from the label when the group is created on the Menu tab and **immutable afterwards** — renaming only changes `menuTitle`, so translations survive. The group label's translation key is `menu.<groupId>.menuTitle` (the `menu.` prefix keeps group keys from colliding with `${pageName|feature}.menuTitle` namespaces).
  - `menuTitle` is **required** on groups (there is no target to fall back to).
- **No `menu`** (older configs) → the nav derives from the pages array order, exactly as before the Menu tab existed.
- **Integrity** is enforced by `SiteConfigSchema`: no duplicate entries across the top level and all groups combined (one global id space), no references to unknown pages — inside groups too — and no invalid `groupId`.
- **Reconciliation** — the shared `reconcileMenu` helper keeps the menu in sync with the pages set and the gallery's tags: entries of deleted pages are pruned (inside groups too), new pages are appended (visible) **at the top level**, and newly-enabled features are appended (hidden) until an admin opts them in. The gallery entry's tag submenu is synced too: newly created tags gain their row **deactivated** (activating is an explicit admin choice), deleted tags lose theirs, the stored order is kept; deprecated standalone `galleryTag` entries are dropped with their activation carried onto the submenu row, and a gallery entry found inside a group is pulled back to the top level. Groups are kept even when emptied — deleting one is an admin decision. The Menu tab applies it on load; the Pages editor applies it on save. Note that renaming a `pageName` counts as delete + re-add, so that entry returns to the end of the menu with default visibility (leaving any group it was in).

The **Menu** tab of `/manage/site` edits this: reorder with the up/down controls (within a level — a group moves as a block), rename with the pencil control, toggle visibility per entry, create groups with **Add group**, activate/order the gallery submenu's tag rows (indented under the gallery entry — every declared tag is listed; no rename there, a tag is named on the gallery page), pick the desktop submenu display (*Pop-over* / *Secondary bar* — shown once a group exists), and use each row's **⋮** menu to move an entry into or out of a group, toggle a group's *always expanded on mobile* mode, or delete a group (its children return to the top level, in place). Save with `PUT /api/config/menu` — writes the draft; publish to go live.

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
  "title": "Our team (optional page heading)",
  "presentation": "markdown… (optional, shown above the member list)",
  "members": [
    {
      "slug": "jane-doe",
      "name": "Jane Doe",
      "jobTitle": { "en": "Founder & CEO", "fr": "Fondatrice & PDG" },
      "photoUrl": "/images/team/jane-doe.jpg",
      "biography": { "en": "markdown…", "fr": "markdown…" },
      "socialLinks": { "linkedin": "https://…", "website": "https://…" },
      "former": false
    }
  ],
  "alternateLayout": false,
  "showFormerMembers": false,
  "formerMembersTitle": "Former members (optional section heading)",
  "design": {
    "teamPage": { "pictureRadius": 50, "pictureBorder": false, "frameBorder": false },
    "memberPage": { "frameBackgroundColor": "#fafafa" }
  }
}
```

- **Direct save** — unlike the site configuration there is **no draft/publish step**: saving from `/manage/team` (`PUT /api/team`, whole-list replace) is live immediately. The editor says so explicitly.
- **`slug`** is the member's public URL identifier (`/team/member/<slug>`): lowercase kebab-case, unique across members, auto-derived from the name in the editor until edited by hand. Once the member has been saved the slug is **permanent** — the field turns read-only and renaming the member never changes their URL.
- **`biography`** (markdown) and **`jobTitle`** are per-locale records, stored **inside the member** — independent of the translations blob. The member dialog shows one language switch driving both fields, only when the platform offers more than one language; rendering uses the active locale, falling back to the base locale, then to the first non-empty entry (`pickLocalizedText`). A legacy plain-string `jobTitle` is coerced into the base-locale entry on parse. `name` and `photoUrl` are language-neutral. All markdown fields (biographies, presentation, section slots) render GitHub-flavored markdown — tables, strikethrough, task lists — through the shared `Markdown` component (`apps/web/src/components/Markdown.tsx`).
- **`socialLinks`** (optional) — supported networks: `linkedin`, `x`, `github`, `instagram`, `facebook`, `youtube`, `website` (see `SocialNetworksEnum` in `libs/interfaces/src/team.interface.ts`).
- **`title`** (optional) and **`presentation`** (optional, markdown) — the team page's heading and the introduction text above the member list, both edited from the **Page** tab of `/manage/team` (the **Members** tab manages the people; each tab saves independently by re-fetching and merging, so they can't clobber each other). Absent/empty → not rendered. Unlike biographies they are translation **defaults**: per-language values live on the Translations page under the `team.title` / `team.presentation` keys (each editor field has a shortcut deep-linking to its key, and the Translations editor lists them automatically while the feature is on — `collectTeamI18nEntries`).
- **`former`** (optional, per member — toggled in the member dialog) moves a member out of the main list and into the team page's **former-members section**, which renders only while **`showFormerMembers`** (switch in the team editor) is on. The section sits under a horizontal separator with an optional heading (**`formerMembersTitle`** — a translation default under `team.formerMembersTitle`, like the page title); its rows render lighter with grayscale portraits — the personal page keeps full color and shows a "Former member" chip next to the job title instead. Hidden former members keep their `/team/member/<slug>` page reachable by URL, like hidden menu entries.
- **`design`** (optional) — per-surface design options edited from the **Design** tab of `/manage/team`, split between `teamPage` (the member rows) and `memberPage` (the profile page). Each surface offers `pictureRadius` (portrait corner radius, 0–50 % — 50 = circle, with a live shape preview next to the slider), `pictureBorder` + `pictureBorderColor` (theme primary when empty), and the description frame: `frameBackgroundColor`, `frameBorder`, `frameBorderColor` (theme divider when empty). Only deviations from the surface defaults are stored — by default team rows stay flat/frameless and the profile keeps its bordered bio card. The team-page block also hosts the **`alternateLayout`** switch (moved from the Page tab).
- **Array order** is the display order of the public team overview (within each section).
- **Public rendering** — `/team` shows the 404 page with no members and the single member's profile with exactly one. With several members it renders flat full-width rows (no panels): the identification block — circular photo (or initial avatar), name linking to the member page, job title, social icons — on one side and the biography on the other. Long biographies are truncated at a word boundary (~300 characters, markdown-safe) and end with a clickable ellipsis linking to the member's page. **`alternateLayout`** (toggle in the team editor) flips sides every other row on desktop; mobile always stacks one column, identification above biography. Unknown slugs 404. The single-member profile shows the circular photo with name and job title underneath, the full biography in a card panel, and — only when links are provided — a centered row of social icons below it. When the member's texts exist in several languages, the profile shows its own **language switch** (job title + biography), preselected to the platform locale when the profile has it.
- The **menu** links to `/team` through a `{ "type": "feature", "feature": "team" }` entry (see [Menu](#menu)); the entry only renders while the flag is on.

## Contact

The contact settings live in their **own blob** (key `contact`, no dev seed — absent means `{}`) behind the **`FEATURE_CONTACT`** flag — when the flag is off, `/manage/contact`, the public `/contact` page and the whole `/api/contact*` surface behave as if they don't exist (404).

```json
{
  "presentation": "markdown… (optional, shown above the contact form)"
}
```

- **Direct save** — like the team, there is **no draft/publish step**: saving from `/manage/contact` (`PUT /api/contact`, whole-object replace) is live immediately.
- **`presentation`** (optional, markdown) — the introduction text above the public contact form. Absent/empty → not rendered. It is a translation **default**: per-language values live on the Translations page under the `contact.presentation` key (the editor field has a shortcut deep-linking to it, and the Translations editor lists the key automatically while the feature is on — `collectContactI18nEntries`).
- The **form itself is not configured here**: the visitor email + message contract is the shared `ContactRequestSchema`, and the send is relayed by `POST /api/contact/message` — see [api.md](api.md#contact) for the endpoint contract, rate limiting and the required Resend environment variables.
- The **menu** links to `/contact` through a `{ "type": "feature", "feature": "contact" }` entry (see [Menu](#menu)); the entry only renders while the flag is on.

## Gallery

The gallery lives **inside the site configuration** under the optional `gallery` attribute — unlike the team/contact blobs it follows the **draft → publish** cycle — behind the **`FEATURE_GALLERY`** flag: when the flag is off, `/manage/gallery`, the public `/gallery*` pages, the gallery menu entries and `PUT /api/config/gallery` behave as if they don't exist (404). The attribute itself **stays in the stored config** either way — only its interpretation is gated, so flipping the flag never loses data.

```json
{
  "gallery": {
    "items": [
      { "imageUrl": "https://ik.imagekit.io/…/sunrise.jpg", "title": "Sunrise", "subtitle": "Corsica, 2025", "tags": ["landscapes"] }
    ],
    "tags": [
      { "tag": "landscapes", "displayName": "Landscapes", "description": "Shot in **Corsica**." }
    ],
    "design": { "captionPosition": "left", "displayMode": "grid" }
  }
}
```

- **Items** — one flat list: an image (typically picked from the media library), a required `title`, an optional `subtitle`, and the **`tags`** the item carries (any number of the gallery's declared tags — schema-enforced references). Title and subtitle are translation **defaults**: per-language values live on the Translations page under `gallery.items.<i>.title|subtitle` (item keys are **positional**, so reordering items re-maps translations by position; the editor lists the keys automatically while the flag is on — `collectGalleryI18nEntries`). **An item whose image is missing is not displayed at all** — not in the lists, not in the zoom carousel (a load failure hides it too); it is kept in the config and flagged in the editor.
- **Tags** — the gallery's organising concept, with their own lifecycle on the gallery admin page. The **`tag`** id allows plain unaccented alphanumerics plus `-` and `_` (`^[a-zA-Z0-9_-]+$`, ≤ 64 chars), is unique (schema-enforced) and **immutable once created** — it doubles as the collection's URL segment (`/gallery/tag/<tag>`) and i18n-key segment, so it can never be renamed without orphaning translations and breaking links. What CAN change is the tag's presentation: a required **`displayName`** (shown in menus and as the collection page's heading — a translation default under `gallery.tag.<tag>.menuTitle`) and an optional **`description`** (markdown, shown under that heading — `gallery.tag.<tag>.description`). **Deleting a tag deletes its references too**: every item carrying it is untagged (the items stay), and menu entries pointing at it resolve away from the nav (pruned on the next menu reconciliation). A "theme" is simply the collection of items carrying a tag.
- **`design.itemShowTitle`** + **`design.itemShowSubtitle`** (optional booleans; absent → shown — only `false` is stored) — whether the browsing lists show each item's title / subtitle, **independently**, in the captioned modes (`list`, `grid`, `alternate`; `mosaic` never captions). Both off → no caption block at all. The **zoom view always keeps** title and subtitle, whatever the toggles.
- **`design.captionPosition`** (optional) — where each item's caption (title + subtitle) sits relative to the image, **in the `list` mode only**: `above`, `below` (default — omitted when stored), `left` or `right`. Side captions stack on mobile (left falls back to above, right to below). The other modes place — or drop — the caption themselves (see `displayMode`); the stored value survives mode switches, and the option hides while both caption toggles are off (nothing left to position).
- **`design.displayMode`** (optional) — how a list of items is browsed: `list` (default — omitted when stored; centered shots, caption per `captionPosition`), `grid` (a responsive card grid, caption always **below** each image), `mosaic` (masonry columns of natural-height tiles, **images only — no caption**; title/subtitle still show in the zoom view) or `alternate` (full-width rows whose image/caption sides flip on every row, like the team page's alternating layout; mobile stacks).
- **`design.itemMaxWidthPercent`** (optional) — caps each item's clickable image at this **percentage of the screen width** (integer, 10–100 — the visitor's resolution is never known in advance), in **every** display mode, on **landscape screens only** (height smaller than width; portrait keeps the mode's natural width). Absent → no cap. The zoom view is unaffected — it keeps maximising to the screen.
- **Item frame** (optional, all display modes) — the tiles' chrome: **`design.itemElevation`** (drop shadow; one of the platform's shadow steps — `0`, `1`, `2`, `4`, `8`, `16`, `24` — since its visual identity leaves every other index flat; absent/0 → flat), **`design.itemBorder`** + **`design.itemBorderColor`** (2 px solid border; empty color → the theme's primary), and **`design.itemCornerRadius`** (px, 0–48; 0 = sharp corners; absent → 4 px). Only deviations are stored, and the border color only while the border is on.
- **`design.itemColumns`** (optional, 2–5; absent → 3) — desktop column count of the **tiled modes** (`grid`, `mosaic`). Narrow screens always collapse (one column on phones, two from `sm`), so a 5-column gallery never squeezes onto a phone.
- **`design.itemAspectRatio`** + **`design.itemFit`** (optional; absent → `4:3` / `cover`) — ratio imposed on the **grid** tiles (`original`, `1:1`, `4:3`, `3:2`, `16:9`) and how each image fills it (`cover` crops, `contain` shows it whole). The other modes always keep the image's natural proportions.
- **`design.itemSpacing`** (optional: `tight`, `normal` — default —, `airy`) — the gutter between items, in every mode.
- **Watermark** (optional) — **`design.watermarkText`** (≤ 40 chars; empty → none) is burnt into the **public renditions by the media CDN** (the stored originals are never modified, and the admin thumbnails stay clean), with **`design.watermarkPosition`** (`bottomRight` — default —, `bottomLeft`, `topRight`, `topLeft`, `center`), **`design.watermarkColor`** (six-digit hex, default `#FFFFFF`) and **`design.watermarkOpacity`** (10–100 %, default 60). The mark scales with each rendition, so it stays proportional across the responsive `srcSet` — see [media.md](media.md#delivery-optimisation-url-transformations).
- **Public rendering** — `/gallery` browses the **whole** gallery as one list in the design's display mode (tags never partition the root). This GENERAL page is where tags surface visually: a **tag bar** under the heading (every tag with a displayable collection) and **discreet clickable chips overlaid semi-transparent on each image's bottom edge** — the same treatment in every display mode — all navigating to the collections. `/gallery/tag/<tag>` explores one tag's collection — its displayName as the heading, its description as a markdown introduction, its items in the same display mode, **chip-free**, with a back link to the general gallery above the heading (same translatable *all items* label as the submenu). Clicking a shot — whatever the mode — opens the **zoom mode**: the image maximised to what the screen can offer with its title/subtitle kept visible, browsed as a **wrap-around carousel** (left/right arrows, keyboard arrows, **horizontal swipe** on touch screens, Escape/close to return), with a **counter** (`3 / 12`) situating the visitor in the list. An unknown tag, a collection with nothing displayable, or a gallery with nothing displayable → 404.
- **Menu** — the gallery feature entry carries its **tag submenu** (see [Menu](#menu)): the Menu tab lists every declared tag under it; activated tags with displayable collections render as a submenu behind an *all items* link, and with none the entry stays a plain `/gallery` link. Nothing is activated automatically when a tag is created, and the gallery entry can never join a group.
- **Editing** — `/manage/gallery` (shown while the flag is on) is split into three URL-addressed tabs: **Items** (`/manage/gallery/items`) manages the item list as clickable **thumbnails** — an added item appears at once (its tag chips below), and clicking one opens its attributes dialog (image picked from the media library when that feature is on, title, subtitle with Translate shortcuts, the item's **tags** as a multi-select, and remove). **Tags** (`/manage/gallery/tags`) holds the tag lifecycle — create (the id is validated live and immutable; the displayName defaults to it), rename the displayName, edit the description, delete (with its references — the row states the item count). **Design** (`/manage/gallery/design`) picks the display mode and shows **only the options applicable to it** — caption position in list, columns in the tiled modes, tile ratio and filling in grid; the mode-independent settings (spacing, maximum item width, item frame, watermark) always show. Per the [show-only-applicable-options principle](contributing.md#guidelines), an inapplicable option is hidden — never disabled — and its stored value survives mode switches. The tab renders a symbolic skeleton **preview** of the picked design — solid rectangles for the images, solid bars for the title/subtitle lines — sticky on the right half of the screen (desktop only), with a **landscape/portrait toggle** simulating the visitor's screen (portrait collapses the tiled modes to one column and stacks side captions and alternating rows, mirroring the public responsive rules). The toggle hides **no** design option: orientation is the visitor's context, not a design choice. Every tab saves via `PUT /api/config/gallery`, merging over a fresh draft read so tabs can't clobber each other (item tag references are pruned against the freshest tag set at save — the delete cascade applied across tabs) — **writes the draft**; publish from the dashboard to go live.

## Events

Events live **inside the site configuration** under the optional `events` attribute — like the gallery, they follow the **draft → publish** cycle — behind the **`FEATURE_EVENTS`** flag: when the flag is off, `/manage/events`, the public `/events*` pages, the events menu entry and `PUT /api/config/events` behave as if they don't exist (404). The attribute itself **stays in the stored config** either way — only its interpretation is gated, so flipping the flag never loses data.

```json
{
  "events": {
    "events": [
      {
        "slug": "summer-festival",
        "name": "Summer Festival",
        "description": "Three days of **concerts** on the waterfront.",
        "imageUrl": "https://ik.imagekit.io/…/festival.jpg",
        "startDateTime": "2027-06-18T15:00:00.000Z",
        "endDateTime": "2027-06-20T20:00:00.000Z",
        "location": "Place de la Bourse, Bordeaux",
        "websiteUrl": "https://example.com/summer-festival"
      }
    ],
    "upcomingTitle": "Prochainement",
    "pastHeader": "Our *archives*.",
    "design": {
      "agendaPage": { "pastEventsMode": "from", "pastEventsFromDate": "2026-01-01", "columns": 2 },
      "eventPage": { "imageAspectRatio": "4:3" }
    }
  }
}
```

- **Events** — one list in any order (public placement is automatic; the editor sorts by start date). Each event: an immutable kebab-case **`slug`** (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, ≤ 64 chars, unique — it is the detail page's URL segment `/events/<slug>` AND the i18n-key segment, so it locks after the first save), a required **`name`**, an optional **`description`** (markdown, shown on the detail page), an optional **`imageUrl`** (typically from the media library), **`startDateTime`** + optional **`endDateTime`**, a required **`location`**, and an optional **`websiteUrl`** (opened in a new tab). Name, description and location are translation **defaults**: per-language values live on the Translations page under `events.<slug>.name|description|location` (slug-scoped — reordering never re-maps translations; the editor lists the keys automatically while the flag is on — `collectEventsI18nEntries`).
- **Dates** — instants are stored as **UTC ISO strings** (`…Z` required; timezone-less, offset or date-only strings are rejected). Rendering and day-level classification happen in the **visitor's timezone**; the admin edits through native `datetime-local` inputs in their own timezone, converted on save. `endDateTime` must not precede `startDateTime`; absent → single-day event.
- **Automatic placement** (public `/events` agenda) — an event is **past** once the local midnight after its last day has passed (an event ending today is not yet past). The first non-past event by start date is **featured** (an ongoing one naturally wins); the later ones are **upcoming** cards; past events group by start year, years and events both descending. The featured date sentence follows four rules: single-day today → *"Today, {date} from {time}"*, single-day later → *"On {date} from {time}"*, multi-day not started → *"From {startDate} to {endDate}"*, multi-day started → *"Until {endDate}"* (long date format: weekday + day + month + year; cards use the short 2-digit format). The detail page reuses the same sentence rules.
- **Section texts** — **`upcomingTitle`** / **`pastTitle`** (optional; absent/empty → the app's bundled labels — the featured section carries **no heading**) and **`nextHeader`** / **`upcomingHeader`** / **`pastHeader`** (optional markdown introductions rendered above/under their section; absent → nothing rendered). All five are translation defaults under `events.upcomingTitle` … `events.pastHeader`.
- **`design.agendaPage`** (optional, deviations only) — **`pastEventsMode`** (`all` — default —, `none` hides the past section entirely, `from` keeps past events starting on/after **`pastEventsFromDate`** — a `YYYY-MM-DD` cut-off, e.g. January 1st to show only the current year; the date is kept when the mode changes); **`cardAspectRatio`** (`A4` — the portrait print-poster ratio, default (illustrations are mostly digital versions of printed posters) —, `16:9`, `4:3`, `1:1`); **`columns`** (2–4; absent → 3 — desktop only, narrow screens collapse); **`showLocationOnCards`** (absent → shown; only `false` is stored); **`showFeaturedBackdrop`** (absent → shown; only `false` is stored — off, the featured section drops its blurred-cover layer and sits on the page background, its poster elevated with a shadow instead).
- **`design.eventPage`** (optional) — **`imageAspectRatio`** of the detail page's header illustration (same values; absent → `16:9`).
- **Public rendering** — `/events` renders the three sections with no *visible* page heading of its own (a visually-hidden `h1` keeps the page title — the `events.menuTitle` chain — for assistive tech; a section with nothing to show disappears — in particular the featured section is absent when no event is ongoing or upcoming; nothing at all → 404). The featured block carries no heading of its own (only its optional markdown intro) and is laid out like a hero whose **background is the illustration itself, abstracted into a blurred cover** (posters of any ratio become a square-cornered backdrop bleeding across the FULL viewport width — the section renders outside the page container, its content staying on the site's max width; no illustration → the brand gradient): the sharp poster sits on the left third (contained, never cropped), and the presentation on the right two thirds rests on a **contrasted, slightly transparent panel** (readable over any backdrop) — the **date first**, then the name (linking to the detail page), the whole markdown description, a **More info** contained button to the event website (new tab; same button on the detail page), and the location. The **cards** (upcoming and past alike) are **elevated**, entirely clickable to `/events/<slug>`: the name and date(s) sit **on the illustration** over a frosted (blurred, darkened) strip, and the location — plain text, no nested link — sits under the illustration. The featured block's and detail page's **location** opens a Google Maps search on the address in a new tab (`https://www.google.com/maps/search/?api=1&query=<encoded address>` — the displayed address is the translated one, the query keeps the stored original). Events without an image show a brand-gradient placeholder. An unknown slug → 404.
- **Menu** — a plain feature entry (see [Menu](#menu)): appended **hidden** when the flag turns on, labelled under `events.menuTitle` (default *Events*).
- **Editing** — `/manage/events` (shown while the flag is on) is split into two URL-addressed tabs: **Events** (`/manage/events/list`) manages the list — sorted by start date descending with a *Past* chip, no manual reorder (placement is automatic); a row opens the edit dialog (name with auto-derived slug — locked after the first save —, illustration from the media library when that feature is on, start/end in the admin's local timezone, location, website, markdown description; saved events carry Translate shortcuts on name/location/description); deletion asks for confirmation. **Design** (`/manage/events/design`) covers the agenda options (past-events visibility — the cut-off date field only shows in `from` mode, per the [show-only-applicable-options principle](contributing.md#guidelines), and survives mode switches —, card ratio/columns/location, featured backdrop), the section texts (each with a Translate shortcut; the featured section only offers its markdown intro), and the event page's image ratio. Every tab saves via `PUT /api/config/events`, merging over a fresh draft read so tabs can't clobber each other — **writes the draft**; publish from the dashboard to go live.
