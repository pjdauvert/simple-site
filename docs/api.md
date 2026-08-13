# API Reference

All endpoints are exposed under `/api/*`, redirected to `/.netlify/functions/*` by `netlify.toml`.

POST / PUT / PATCH requests must include `Content-Type: application/json`. GET requests do not require this header.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Retrieve the **published** site configuration (public) |
| GET | `/api/config/draft` | Retrieve the working **draft** configuration (admin) |
| POST | `/api/config` | Replace the **draft** configuration (admin) |
| PUT | `/api/config/site` | Update the `site` section of the **draft** (admin) |
| PUT | `/api/config/themes` | Replace the `themes` array of the **draft** (admin) |
| PUT | `/api/config/menu` | Replace the `menu` of the **draft** (admin) |
| PUT | `/api/config/gallery` | Replace the `gallery` of the **draft** (admin, flag-gated) |
| POST | `/api/config/publish` | Publish the draft — promote it live, archive the previous (admin) |
| POST | `/api/config/import` | Upload a configuration as the new named draft (admin) |
| GET | `/api/config/versions` | List versions: published, draft, archives (admin) |
| GET | `/api/config/versions/:key` | Download a version's `SiteConfig` (admin) |
| PUT | `/api/config/versions/:key` | Rename a version (admin) |
| POST | `/api/config/versions/:key/publish` | Re-publish (roll back to) an archive (admin) |
| POST | `/api/config/versions/:key/draft` | Start a new draft from a version (admin) |
| DELETE | `/api/config/versions/:key` | Delete an archive (admin) |
| GET | `/api/translations` | Retrieve the default language + all override dictionaries (public) |
| GET | `/api/translations/:language` | Retrieve translation dictionary for a locale (public) |
| POST | `/api/translations/:language` | Merge translations into an override locale (admin) |
| PUT | `/api/translations/:language` | Replace an override locale's whole dictionary (admin) |
| PUT | `/api/translations` | Bulk-import an `i18n.json`-shaped file — upsert override languages (admin) |
| DELETE | `/api/translations/:language` | Remove an override language (admin; default + last override protected) |
| GET | `/api/team` | Retrieve the team members (public, flag-gated) |
| PUT | `/api/team` | Replace the team members — live immediately (admin, flag-gated) |
| GET | `/api/contact` | Retrieve the contact page settings (public, flag-gated, rate-limited) |
| POST | `/api/contact/message` | Validate a contact form payload and relay it by email via Resend (public, flag-gated, rate-limited) |
| PUT | `/api/contact` | Replace the contact page settings — live immediately (admin, flag-gated, rate-limited) |
| GET | `/api/features` | Report enabled feature flags (public) |
| POST | `/api/media/upload-auth` | Mint an ImageKit Upload V2 token (admin, flag-gated) |
| GET | `/api/media` | List a folder's sub-folders + files (admin, flag-gated) |
| POST | `/api/media/folder` | Create a folder (admin, flag-gated) |
| PUT | `/api/media/folder` | Rename a folder and its contents (admin, flag-gated) |
| DELETE | `/api/media/folder` | Delete a folder and its contents (admin, flag-gated) |
| PUT | `/api/media` | Rename a media file (admin, flag-gated) |
| DELETE | `/api/media/:fileId` | Delete a media file (admin, flag-gated) |

---

Configuration uses a **draft → publish** model with a linear archive history (see [configuration.md](configuration.md#versioning-draft--publish--archive)). The live site reads the **published** config via `GET /api/config`; admins edit a **draft** and publish it to go live. Publishing archives the previously-published config with a reverse-chronological, second-precision timestamp so it can be restored. At most **10 versions** (published + archives; the draft is uncounted) are retained — creating a new archive beyond that erases the archive with the oldest `createdAt`.

### `GET /api/config`

Returns the **published** `SiteConfig` from Netlify Blobs (key `config`). This is the live configuration the site renders. On the first request in a dev environment the blob is seeded automatically from the bundled `siteConfig.json`. **Public** — the only public config route.

```json
// 200 OK
{ "ok": true, "data": { /* SiteConfig */ } }
```

### `GET /api/config/draft`

Returns the working **draft** `SiteConfig` (key `config:draft`), or the published config when no draft exists yet (reading never creates a draft). Backs the admin edit forms on `/manage`.

```json
// 200 OK
{ "ok": true, "data": { /* SiteConfig */ } }
```

### `POST /api/config`

Replaces the whole **draft** configuration (never writes live). The body must be a complete, valid `SiteConfig` object — validated by Zod before storage.

```json
// Request body
{ /* SiteConfig — see docs/configuration.md for the full schema */ }

// 200 OK
{ "ok": true, "data": { "message": "Draft updated successfully" } }
```

### `PUT /api/config/site`

Updates only the `site` section (`siteName`, `logoUrl`, `faviconUrl`, `containerMaxWidth`, `defaultLanguage`) of the **draft**. The server reads the draft (or the published config if no draft exists), replaces its `site` object with the (Zod-validated) body, re-validates the whole `SiteConfig`, then persists the draft — so `themes` and `pages` are left untouched, and the change does not go live until published. Backs the **General** tab of the `/manage/site` configuration page.

```json
// Request body — a SiteThemeConfig object
{ "siteName": "Simple Site", "logoUrl": "/logo.svg", "faviconUrl": "/favicon.ico", "containerMaxWidth": "lg", "defaultLanguage": "en" }

// 200 OK
{ "ok": true, "data": { "message": "Site settings updated successfully" } }
```

### `PUT /api/config/themes`

Replaces the entire `themes` array of the **draft** (add / edit / delete are all expressed as "send the full list"). The server reads the draft (or the published config if no draft exists), swaps in the (Zod-validated) `themes` array, re-validates the whole `SiteConfig`, then persists the draft — so `site` and `pages` are left untouched, and the change does not go live until published. Backs the **Themes** tab of the `/manage/site` configuration page.

```json
// Request body — an array of ThemeConfig objects
[{ "themeName": "Light", "primaryColor": "#1976d2", "secondaryColor": "#9c27b0", "linkColor": "#1976d2", "linkHoverColor": "#1565c0", "backgroundColor": "#ffffff", "menuBackgroundColor": "#f5f5f5", "menuHoverColor": "#e0e0e0" }]

// 200 OK
{ "ok": true, "data": { "message": "Themes updated successfully" } }
```

### `PUT /api/config/menu`

Replaces the `menu` of the **draft** — the ordered list of navigation entries with per-entry visibility, including one-level `group` submenus (see [configuration.md](configuration.md#menu)). The server reads the draft (or the published config if no draft exists), swaps in the (Zod-validated) `menu`, re-validates the whole `SiteConfig` — rejecting duplicate entries (one id space across the top level and all group children), references to unknown pages (inside groups too), nested groups, invalid or duplicate `groupId`s, empty group labels, and page routes on feature-reserved paths — then persists the draft. Backs the **Menu** tab of the `/manage/site` configuration page.

```json
// Request body — a MenuConfig object
{ "entries": [
  { "type": "page", "pageName": "page.home", "visible": true },
  { "type": "feature", "feature": "team", "visible": false },
  { "type": "group", "groupId": "moreLinks", "menuTitle": "More links", "visible": true, "children": [
    { "type": "page", "pageName": "page.about", "visible": true }
  ] }
], "groupDisplay": "bar" }  // optional menu-wide desktop group rendering: "popover" (default) | "bar"

// 200 OK
{ "ok": true, "data": { "message": "Menu updated successfully" } }
```

### `PUT /api/config/gallery`

Replaces the `gallery` of the **draft** — the themed image gallery (see [configuration.md](configuration.md#gallery)). Gated by the **`FEATURE_GALLERY`** flag: when it is not `"true"` this route returns `404` **before auth**, while the rest of the config surface — including a stored `gallery` attribute, which `GET /api/config` keeps serving — is unaffected. The server reads the draft (or the published config if no draft exists), swaps in the (Zod-validated) `gallery` — rejecting duplicate or invalid `themeId`s and empty theme/item titles — re-validates the whole `SiteConfig`, then persists the draft. Backs the `/manage/gallery` editor.

```json
// Request body — a GalleryConfig object
{ "items": [ { "imageUrl": "https://…/sunrise.jpg", "title": "Sunrise", "subtitle": "Corsica" } ],
  "themes": [ { "themeId": "landscapes", "title": "Landscapes", "items": [] } ],
  "design": { "captionPosition": "left", "displayMode": "grid" } }
// design is optional; displayMode: "list" (default) | "grid" | "mosaic" | "alternate";
// captionPosition ("above" | "below" (default) | "left" | "right") applies to the list mode only;
// itemMaxWidthPercent (int, 10-100, % of the screen width) caps each item's image
// in every mode — landscape screens only;
// item frame: itemElevation (0|1|2|4|8|16|24 — the platform's shadow steps),
// itemBorder (bool) + itemBorderColor
// (CSS color, empty = theme primary), itemCornerRadius (int 0-48 px)


// 200 OK
{ "ok": true, "data": { "message": "Gallery updated successfully" } }
```

### `POST /api/config/publish`

Promotes the draft to live: the outgoing published config is archived (key `config:archive:<YYYYMMDDHHMMSS>`), the draft becomes the published config (inheriting the draft's name), and the draft is cleared. Returns `409 CONFLICT` when there is no draft, or when the draft is identical to the published config. Retention is capped at **10 versions** (published + archives); creating an archive beyond that erases the archive with the oldest `createdAt`.

```json
// 200 OK
{ "ok": true, "data": { "message": "Configuration published successfully", "published": { "key": "published", "name": "..." } } }
```

### `POST /api/config/import`

Validates an uploaded `SiteConfig` and stores it as the new named **draft** (invalid payloads return `400 INVALID_REQUEST`). If a draft already exists it is archived first (draft work is never discarded — only one draft exists at a time). Publish it separately to go live.

```json
// Request body
{ "name": "Homepage refresh", "config": { /* SiteConfig */ } }

// 200 OK
{ "ok": true, "data": { "message": "Configuration imported as draft", "draft": { "key": "draft", "name": "Homepage refresh" } } }
```

### `GET /api/config/versions`

Returns the version manifest: the published config, the draft (or `null`), and the archive history (newest first).

```json
// 200 OK
{ "ok": true, "data": {
  "published": { "key": "published", "name": "version_20260703104512" },
  "draft":     { "key": "draft", "name": "version_20260703110233" },
  "archives":  [ { "key": "20260702160435", "name": "version_20260701090000", "createdAt": "2026-07-01T09:00:00.000Z" } ]
} }
```

Version names default to `version_<YYYYMMDDHHMMSS>` (the UTC time the version was created) and are editable via `PUT /api/config/versions/:key`. A published/re-published version keeps its name, and an archive keeps the name of the config it snapshotted.

### `GET /api/config/versions/:key`

Returns a single version's `SiteConfig` — used to download/export it. `:key` is `published`, `draft`, or an archive id (its timestamp). `404 NOT_FOUND` if absent.

### `PUT /api/config/versions/:key`

Renames a version (published, draft, or archive). `:key` as above.

```json
// Request body
{ "name": "Spring campaign" }

// 200 OK
{ "ok": true, "data": { "message": "Version renamed successfully" } }
```

### `POST /api/config/versions/:key/publish`

Rolls back to an archive: the archive `:key` becomes the live config and the currently-published config is archived in its place. Only archive ids are valid (`published`/`draft` → `400`).

```json
// 200 OK
{ "ok": true, "data": { "message": "Archive re-published successfully", "published": { "key": "published", "name": "..." } } }
```

### `POST /api/config/versions/:key/draft`

Starts a new working **draft** from a version's content (`:key` = `published` or an archive id; `draft` → `400`). The source version is left in place. If a draft already exists it is archived first, so draft work is never lost and only one draft exists at a time.

```json
// 200 OK
{ "ok": true, "data": { "message": "Draft started from version", "draft": { "key": "draft", "name": "version_20260703120500" } } }
```

### `DELETE /api/config/versions/:key`

Permanently deletes an archive. Deleting `published` or `draft` is rejected (`400 INVALID_REQUEST`).

```json
// 200 OK
{ "ok": true, "data": { "message": "Version deleted successfully" } }
```

---

Languages are **data-driven**: `:language` is any Intl-resolvable **BCP-47** locale code — region and script variants included (`fr`, `fr-CA`, `zh-Hant`) — canonicalized before storage and matching (`fr-ca` ≡ `fr-CA`; unresolvable codes like `xx` → `400`). The set of offered languages is the config's **default language** (`config.site.defaultLanguage`, see [configuration.md](configuration.md#translations)) plus the keys of the stored blob, which holds **override** languages only. The default language never has a dictionary — its text lives in the site configuration — so mutations targeting it return `409 CONFLICT`, and any stored dictionary for it is lazily stripped from the blob on every request (an idempotent migration, so pre-existing blobs converge automatically). `GET` routes are public; mutations are admin-gated.

### `GET /api/translations`

Returns the default language and every **override** language's dictionary (the default language has no dictionary). The public site uses it to discover the available languages; the admin editor loads it wholesale. **Public.**

```json
// 200 OK
{ "ok": true, "data": { "defaultLanguage": "en", "translations": { "fr": { "home.content.title": "Bienvenue" } } } }
```

### `GET /api/translations/:language`

Returns the translation dictionary for the requested locale (`{}` if the language exists but is empty — including the default language, which never has one). **Public.**

```json
// 200 OK
{ "ok": true, "data": { "home.content.title": "Welcome", /* ... */ } }
```

### `POST /api/translations/:language`

Merges the provided key/value pairs into the stored dictionary for the given override locale. Existing keys are overwritten; absent keys are preserved (never removes keys). Returns `409 CONFLICT` when `:language` is the default language.

```json
// Request body — flat record of dotted translation keys → string values
{ "home.content.title": "Bienvenue sur notre site" }

// 200 OK
{ "ok": true, "data": { "message": "fr translations updated successfully" } }
```

### `PUT /api/translations/:language`

Replaces an override locale's **entire** dictionary — keys omitted from the body are removed (unlike `POST`, which only merges). Backs the editor's Save (and Add, which seeds every config key empty). Returns `409 CONFLICT` when `:language` is the default language.

```json
// Request body — the complete desired dictionary for the locale
{ "home.content.title": "Bienvenue sur notre site" }

// 200 OK
{ "ok": true, "data": { "message": "fr translations replaced successfully" } }
```

### `PUT /api/translations`

Bulk-imports an `i18n.json`-shaped file: the body is validated as a `Record<locale, dictionary>` and each language it contains is upserted (replaced, under its canonical code), leaving other existing languages untouched. An entry for the default language is **skipped** — config wins — and doesn't count in the reported total. Invalid files return `400 INVALID_REQUEST`.

```json
// Request body — one or more languages at once
{ "de": { "home.content.title": "Willkommen" }, "es": { "home.content.title": "Bienvenido" } }

// 200 OK
{ "ok": true, "data": { "message": "Imported 2 language(s) successfully" } }
```

### `DELETE /api/translations/:language`

Removes an override language entirely. Returns `409 CONFLICT` for the default language or when it would remove the last remaining override.

```json
// 200 OK
{ "ok": true, "data": { "message": "de removed successfully" } }
```

---

### `GET /api/features`

Public. Reports which optional features the server currently has enabled, so the client can gate its UI at runtime (no rebuild to flip a flag). See [media.md](media.md#feature-flag).

```json
// 200 OK
{ "ok": true, "data": { "media": true, "team": false, "contact": false, "gallery": false } }
```

---

### Team

Served by `apps/functions/src/team.mts` (`TeamModule`), storing members in their own blob (key `team`). The surface is gated by the **`FEATURE_TEAM`** flag: when it is not `"true"`, both routes return `404` (before auth). Unlike the site config there is **no draft/publish lifecycle** — a successful `PUT` is live immediately. See [configuration.md](configuration.md#team) for the member model.

#### `GET /api/team`

Public — the site renders `/team` and `/team/member/<slug>` from it. Returns `{ members: [] }` (not an error) when nothing has been stored yet.

```json
// 200 OK
{ "ok": true, "data": { "members": [
  { "slug": "jane-doe", "name": "Jane Doe", "jobTitle": "Founder & CEO",
    "photoUrl": "/images/team/jane-doe.jpg",
    "biography": { "en": "Jane founded…", "fr": "Jane a fondé…" },
    "socialLinks": { "linkedin": "https://www.linkedin.com/in/jane-doe" } }
] } }
```

#### `PUT /api/team`

Admin. Replaces the whole team (add / edit / delete / reorder are all expressed as "send the full list" — array order is the public overview order). The body is validated by Zod: kebab-case slugs, **unique** slugs, non-empty names, per-locale biography record.

```json
// Request body — a TeamConfig object
{ "members": [ { "slug": "jane-doe", "name": "Jane Doe", "jobTitle": "CEO", "biography": { "en": "…" } } ] }

// 200 OK
{ "ok": true, "data": { "message": "Team updated successfully" } }
```

---

### Contact

Served by `apps/functions/src/contact.mts` (`ContactModule`). The surface is gated by the **`FEATURE_CONTACT`** flag: when it is not `"true"`, every route returns `404` (before auth). The page settings — the presentation message shown above the public form — live in their own blob (key `contact`) with **no draft/publish lifecycle**: a successful `PUT` is live immediately. Reads and the message send are public (the `/contact` page serves anonymous visitors); the settings mutation is admin-gated.

The message send itself stores nothing: the payload is validated and relayed to the site owner's inbox through the [Resend API](https://resend.com/docs/api-reference/introduction). The visitor's address is set as `reply_to` (Resend only sends from verified domains), and the message is sent as plain text so its content is never interpreted as markup. Because the caller is anonymous, provider **and configuration** errors are logged server-side only and surfaced as a generic `500` — the response never names the provider or an environment variable. The Resend call is bounded to **5 s** so a provider stall still answers with the JSON error envelope instead of a platform 502.

Abuse controls: the whole function is **rate-limited to 5 requests per minute per client IP** (Netlify's declarative `rateLimit`; a real visitor needs two — settings + send — per visit; excess requests receive `429`), and the send rejects request bodies over **10 KB** (`400`) before reading them — the schema's 1000-char cap applies after trim, so it does not bound the raw body.

#### `GET /api/contact`

Public — the site renders `/contact` from it. Returns `{}` (not an error) when nothing has been stored yet. The `presentation` string (markdown) is a **translation default**: per-language values are managed on the Translations page under the `contact.presentation` key.

```json
// 200 OK
{ "ok": true, "data": { "presentation": "We usually **reply within a day**." } }
```

#### `PUT /api/contact`

Admin. Replaces the whole settings object; goes live immediately. The body is validated by `ContactConfigSchema`.

```json
// Request body — a ContactConfig object
{ "presentation": "We usually **reply within a day**." }

// 200 OK
{ "ok": true, "data": { "message": "Contact settings updated successfully" } }
```

#### `POST /api/contact/message`

The public send lives on its own action path (not on the settings resource), so it can move to its own function — e.g. for a send-only rate limit — without a breaking rename. The body is validated by the shared `ContactRequestSchema` (`libs/interfaces/src/contact.interface.ts`): a valid email and a non-empty message of at most **1000** characters (trimmed).

```json
// Request body — a ContactRequest object
{ "email": "jane@example.com", "message": "Hello! I'd like to know more about…" }

// 200 OK
{ "ok": true, "data": { "message": "Message sent" } }

// 400 — invalid payload
{ "ok": false, "code": "VALIDATION_FAILED", "message": "Validation failed",
  "details": { "errors": [ { "field": "message", "message": "Too big: expected string to have <=1000 characters" } ] } }
```

---

### Media (ImageKit)

All `/api/media*` routes are **admin-only** (wrapped in `AuthHandler`) and served by a single function, `apps/functions/src/media.mts`. They are also gated by the **`FEATURE_MEDIA`** flag: when it is not `"true"`, every `/api/media*` route returns `404` (before auth) — this disables listing, folders, delete, **and the upload-signature endpoint**. The ImageKit **private key never leaves the server** — it signs upload tokens and authenticates the Management API. Every `path` is **relative** to the server-side `IMAGEKIT_ROOT_DIR`. See [media.md](media.md) for the end-to-end flow and the root-directory model.

#### `POST /api/media/upload-auth`

Mints a short-lived JWT authorizing a single **browser → ImageKit** [Upload File V2](https://imagekit.io/docs/api-reference/upload-file/upload-file-v2) request. The token signs the *entire* upload payload, so the client must echo `uploadPayload` verbatim as multipart fields. `path` selects the target folder (relative to the root dir).

```json
// Request body
{ "fileName": "photo.jpg", "path": "/products", "tags": ["optional", "tags"] }

// 200 OK — token is HS256, kid = public key, exp ≤ iat + 3600s
{ "ok": true, "data": {
  "token": "<jwt>",
  "expire": 1735689600,
  "publicKey": "public_xxx",
  "uploadPayload": { "fileName": "photo.jpg", "folder": "/simple-site/products", "useUniqueFileName": "true" }
} }
```

#### `GET /api/media`

Lists the sub-folders and files of a folder via the ImageKit Management API (HTTP Basic auth). Query params: `path` (relative to root, default root), `type` (`all` | `image` | `video`, default `all`; narrows files only), `limit` (default 100), `skip`.

```json
// 200 OK
{ "ok": true, "data": {
  "folders": [ { "folderId": "...", "name": "products", "path": "/products" } ],
  "files":   [ { "fileId": "...", "name": "photo.jpg", "url": "https://ik.imagekit.io/...", "thumbnail": "...", "mime": "image/jpeg", "size": 12345 } ]
} }
```

#### `POST /api/media/folder`

Creates a folder `name` inside `path` (relative to root).

```json
// Request body
{ "name": "products", "path": "" }

// 200 OK
{ "ok": true, "data": { "message": "Folder created successfully" } }
```

#### `PUT /api/media/folder`

Renames a folder (and updates all nested assets) via ImageKit's async `bulkJobs/renameFolder`.

```json
// Request body
{ "path": "/products", "newName": "goods" }

// 200 OK
{ "ok": true, "data": { "message": "Folder renamed successfully" } }
```

#### `DELETE /api/media/folder?path=<relative>`

Permanently deletes a folder **and all of its contents**.

```json
// 200 OK
{ "ok": true, "data": { "message": "Folder deleted successfully" } }
```

#### `PUT /api/media`

Renames a file via the Management API (`PUT /v1/files/rename`). `filePath` is the file's absolute ImageKit path (as returned in the listing).

```json
// Request body
{ "filePath": "/root/products/old.png", "newFileName": "new.png" }

// 200 OK
{ "ok": true, "data": { "message": "Media renamed successfully" } }
```

#### `DELETE /api/media/:fileId`

Permanently deletes a file (and all versions) via the Management API.

```json
// 200 OK
{ "ok": true, "data": { "message": "Media deleted successfully" } }
```

---

## Response Envelope

All responses — success and error — share the same top-level shape:

```json
// Success
{ "ok": true,  "data": <payload> }

// Error
{ "ok": false, "code": "INVALID_REQUEST", "message": "...", "timestamp": "...", "path": "..." }
```

### Common error status codes

| Status | When |
|--------|------|
| `400` | Missing / invalid body, invalid locale, wrong Content-Type on POST |
| `401` | Missing or invalid Netlify Identity JWT on a protected endpoint |
| `404` | Blob store key not found |
| `405` | HTTP method not allowed for this endpoint |
| `409` | Conflict — e.g. publish with no draft, or a translations mutation targeting the default language / last override |
| `500` | Internal error, Zod schema violation in stored data |

---

## Authentication

Netlify Identity is used to protect mutation endpoints. Before deploying:

1. Enable Identity in the Netlify dashboard: **Site settings → Identity → Enable Identity**
2. Invite the admin user: **Identity tab → Invite users**

### Protected endpoints

The following endpoints require a valid Netlify Identity JWT in the `Authorization` header:

| Method | Path | Auth required |
|--------|------|---------------|
| GET | `/api/config/draft` | ✓ |
| POST | `/api/config` | ✓ |
| PUT | `/api/config/site` | ✓ |
| PUT | `/api/config/gallery` | ✓ (and flag-gated — 404 before auth) |
| POST | `/api/config/publish` | ✓ |
| POST | `/api/config/import` | ✓ |
| GET | `/api/config/versions` | ✓ |
| GET | `/api/config/versions/:key` | ✓ |
| PUT | `/api/config/versions/:key` | ✓ |
| POST | `/api/config/versions/:key/publish` | ✓ |
| POST | `/api/config/versions/:key/draft` | ✓ |
| DELETE | `/api/config/versions/:key` | ✓ |
| POST | `/api/translations/:language` | ✓ |
| PUT | `/api/team` | ✓ |
| PUT | `/api/contact` | ✓ |
| POST | `/api/media/upload-auth` | ✓ |
| GET | `/api/media` | ✓ |
| POST | `/api/media/folder` | ✓ |
| PUT | `/api/media/folder` | ✓ |
| DELETE | `/api/media/folder` | ✓ |
| PUT | `/api/media` | ✓ |
| DELETE | `/api/media/:fileId` | ✓ |

All `GET` endpoints are public **except** `/api/config/draft`, `/api/config/versions`, `/api/config/versions/:key` (admin-only config version management) and `/api/media` (admin-only media management). Only `GET /api/config` (the published config) is public.

**Request header:**
```
Authorization: Bearer <netlify-identity-access-token>
```

The token is obtained via the Netlify Identity service at `/.netlify/identity` (handled automatically by `AuthProvider` in the frontend).

**Unauthenticated POST requests return:**
```json
{ "ok": false, "code": "UNAUTHORIZED", "message": "Authentication required", "timestamp": "..." }
```

---

## Storage

`/api/config*` and `/api/translations/:language` persist data in **Netlify Blobs** under the store `{APP_NAME}-store`. Blobs are seeded on the first dev request — no manual setup is needed. Config versioning uses these keys:

| Key | Contents |
|-----|----------|
| `config` | Published (live) `SiteConfig` — served by `GET /api/config` |
| `config:draft` | Working draft `SiteConfig` (exists only when there are unpublished changes) |
| `config:archive:<YYYYMMDDHHMMSS>` | Snapshot of a previously-published config |
| `config:versions` | Manifest: version names + the archive list (source of truth for the panel) |
| `translations` | Override-language i18n dictionaries — the default language never has one (not versioned) |

---

## Environment Variables

Set these in Netlify (or a local `.env`) before deploying:

```
APP_NAME                 # Namespaces the Netlify Blobs store
FEATURE_MEDIA            # "true" enables the media library (admin page + /api/media*)
FEATURE_TEAM             # "true" enables the team feature (admin page, /team pages, /api/team)
FEATURE_CONTACT          # "true" enables the contact feature (admin page, /contact page, /api/contact)
FEATURE_GALLERY          # "true" enables the gallery (admin page, /gallery pages, menu entries, PUT /api/config/gallery)
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_URL_ENDPOINT
IMAGEKIT_ROOT_DIR        # optional base folder for all media
RESEND_API_KEY           # Resend API key used by /api/contact
CONTACT_FROM_EMAIL       # verified Resend sender the contact notification is sent as
CONTACT_TO_EMAIL         # inbox the contact messages are delivered to
```

Netlify reads the static site from `dist/apps/web` and functions from `dist/apps/functions` as defined in `netlify.toml`. Run `npm run build` locally to produce both artefacts.
