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
| GET | `/api/imagekit-sign` | Generate an ImageKit upload signature |
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
| `404` | Blob store key not found |
| `405` | HTTP method not allowed for this endpoint |
| `500` | Internal error, Zod schema violation in stored data |

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
GOOGLE_API_KEY_SERVER
AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
AUTH0_REDIRECT_URI
```

Netlify reads the static site from `dist/apps/web` and functions from `dist/apps/functions` as defined in `netlify.toml`. Run `npm run build` locally to produce both artefacts.
