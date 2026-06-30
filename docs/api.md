# API Reference

All endpoints are exposed under `/api/*`, redirected to `/.netlify/functions/*` by `netlify.toml`.

POST / PUT / PATCH requests must include `Content-Type: application/json`. GET requests do not require this header.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Retrieve the full site configuration |
| POST | `/api/config` | Replace the site configuration |
| GET | `/api/translations/:language` | Retrieve translation dictionary for a locale |
| POST | `/api/translations/:language` | Merge translations for a locale |
| POST | `/api/send-email` | Validate contact form payload and send via Mailgun |
| GET | `/api/db-query` | Fetch sample users from MongoDB |
| GET | `/api/features` | Report enabled feature flags (public) |
| POST | `/api/media/upload-auth` | Mint an ImageKit Upload V2 token (admin, flag-gated) |
| GET | `/api/media` | List a folder's sub-folders + files (admin, flag-gated) |
| POST | `/api/media/folder` | Create a folder (admin, flag-gated) |
| DELETE | `/api/media/folder` | Delete a folder and its contents (admin, flag-gated) |
| DELETE | `/api/media/:fileId` | Delete a media file (admin, flag-gated) |
| GET | `/api/google-proxy` | Proxy a Google API call with the server API key |

---

### `GET /api/config`

Returns the full `SiteConfig` stored in Netlify Blobs. On the first request in a dev environment the blob is seeded automatically from the bundled `siteConfig.json`.

```json
// 200 OK
{ "ok": true, "data": { /* SiteConfig */ } }
```

### `POST /api/config`

Replaces the stored site configuration. The body must be a complete, valid `SiteConfig` object — validated by Zod before storage.

```json
// Request body
{ /* SiteConfig — see docs/configuration.md for the full schema */ }

// 200 OK
{ "ok": true, "data": { "message": "Configuration updated successfully" } }
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

#### `DELETE /api/media/folder?path=<relative>`

Permanently deletes a folder **and all of its contents**.

```json
// 200 OK
{ "ok": true, "data": { "message": "Folder deleted successfully" } }
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
| POST | `/api/config` | ✓ |
| POST | `/api/translations/:language` | ✓ |
| POST | `/api/media/upload-auth` | ✓ |
| GET | `/api/media` | ✓ |
| POST | `/api/media/folder` | ✓ |
| DELETE | `/api/media/folder` | ✓ |
| DELETE | `/api/media/:fileId` | ✓ |

All `GET` endpoints are public **except** `/api/media` (admin-only media management).

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

`/api/config` and `/api/translations/:language` persist data in **Netlify Blobs** under the store `{APP_NAME}-store`. Blobs are seeded on the first dev request — no manual setup is needed.

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
