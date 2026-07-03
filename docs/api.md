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
| POST | `/api/config/publish` | Publish the draft — promote it live, archive the previous (admin) |
| POST | `/api/config/import` | Upload a configuration as the new named draft (admin) |
| GET | `/api/config/versions` | List versions: published, draft, archives (admin) |
| GET | `/api/config/versions/:key` | Download a version's `SiteConfig` (admin) |
| PUT | `/api/config/versions/:key` | Rename a version (admin) |
| POST | `/api/config/versions/:key/publish` | Re-publish (roll back to) an archive (admin) |
| DELETE | `/api/config/versions/:key` | Delete an archive (admin) |
| GET | `/api/translations/:language` | Retrieve translation dictionary for a locale |
| POST | `/api/translations/:language` | Merge translations for a locale |
| POST | `/api/send-email` | Validate contact form payload and send via Mailgun |
| GET | `/api/db-query` | Fetch sample users from MongoDB |
| GET | `/api/features` | Report enabled feature flags (public) |
| POST | `/api/media/upload-auth` | Mint an ImageKit Upload V2 token (admin, flag-gated) |
| GET | `/api/media` | List a folder's sub-folders + files (admin, flag-gated) |
| POST | `/api/media/folder` | Create a folder (admin, flag-gated) |
| PUT | `/api/media/folder` | Rename a folder and its contents (admin, flag-gated) |
| DELETE | `/api/media/folder` | Delete a folder and its contents (admin, flag-gated) |
| PUT | `/api/media` | Rename a media file (admin, flag-gated) |
| DELETE | `/api/media/:fileId` | Delete a media file (admin, flag-gated) |
| GET | `/api/google-proxy` | Proxy a Google API call with the server API key |

---

Configuration uses a **draft → publish** model with a linear archive history (see [configuration.md](configuration.md#versioning-draft--publish--archive)). The live site reads the **published** config via `GET /api/config`; admins edit a **draft** and publish it to go live. Publishing archives the previously-published config with a reverse-chronological, second-precision timestamp so it can be restored.

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

Updates only the `site` section (`siteName`, `logoUrl`, `faviconUrl`, `containerMaxWidth`) of the **draft**. The server reads the draft (or the published config if no draft exists), replaces its `site` object with the (Zod-validated) body, re-validates the whole `SiteConfig`, then persists the draft — so `themes` and `pages` are left untouched, and the change does not go live until published. Backs the **Site settings** form on the `/manage` admin dashboard.

```json
// Request body — a SiteThemeConfig object
{ "siteName": "Simple Site", "logoUrl": "/logo.svg", "faviconUrl": "/favicon.ico", "containerMaxWidth": "lg" }

// 200 OK
{ "ok": true, "data": { "message": "Site settings updated successfully" } }
```

### `POST /api/config/publish`

Promotes the draft to live: the outgoing published config is archived (key `config:archive:<YYYYMMDDHHMMSS>`), the draft becomes the published config (inheriting the draft's name), and the draft is cleared. Returns `409 CONFLICT` when there is no draft, or when the draft is identical to the published config.

```json
// 200 OK
{ "ok": true, "data": { "message": "Configuration published successfully", "published": { "key": "published", "name": "..." } } }
```

### `POST /api/config/import`

Validates an uploaded `SiteConfig` and stores it as the new named **draft** (invalid payloads return `400 INVALID_REQUEST`). Publish it separately to go live.

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
  "archives":  [ { "key": "20260702160435", "name": "version_20260701090000", "archivedAt": "2026-07-02T16:04:35.000Z" } ]
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

### `DELETE /api/config/versions/:key`

Permanently deletes an archive. Deleting `published` or `draft` is rejected (`400 INVALID_REQUEST`).

```json
// 200 OK
{ "ok": true, "data": { "message": "Version deleted successfully" } }
```

---

### `GET /api/translations/:language`

Returns the translation dictionary for the requested locale.  
Supported values for `:language`: `en`, `fr`.

```json
// 200 OK
{ "ok": true, "data": { "page.home.hero.content.title": "Welcome", /* ... */ } }
```

### `POST /api/translations/:language`

Merges the provided key/value pairs into the stored dictionary for the given locale. Existing keys are overwritten; absent keys are preserved.

```json
// Request body — flat record of dotted translation keys → string values
{ "page.home.hero.content.title": "Welcome to Our Site" }

// 200 OK
{ "ok": true, "data": { "message": "en translations updated successfully" } }
```

---

### `GET /api/features`

Public. Reports which optional features the server currently has enabled, so the client can gate its UI at runtime (no rebuild to flip a flag). See [media.md](media.md#feature-flag).

```json
// 200 OK
{ "ok": true, "data": { "media": true } }
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
| POST | `/api/config/publish` | ✓ |
| POST | `/api/config/import` | ✓ |
| GET | `/api/config/versions` | ✓ |
| GET | `/api/config/versions/:key` | ✓ |
| PUT | `/api/config/versions/:key` | ✓ |
| POST | `/api/config/versions/:key/publish` | ✓ |
| DELETE | `/api/config/versions/:key` | ✓ |
| POST | `/api/translations/:language` | ✓ |
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
| `translations` | i18n dictionaries (not versioned) |

---

## Environment Variables

Set these in Netlify (or a local `.env`) before deploying:

```
APP_NAME                 # Namespaces the Netlify Blobs store
MONGODB_URI
MAILGUN_API_KEY
MAILGUN_DOMAIN
MAILGUN_TO_EMAIL
IMAGEKIT_PRIVATE_KEY
IMAGEKIT_PUBLIC_KEY
IMAGEKIT_URL_ENDPOINT
IMAGEKIT_ROOT_DIR        # optional base folder for all media
GOOGLE_API_KEY_SERVER
```

Netlify reads the static site from `dist/apps/web` and functions from `dist/apps/functions` as defined in `netlify.toml`. Run `npm run build` locally to produce both artefacts.
