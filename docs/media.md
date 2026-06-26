# Media Management (ImageKit)

The admin **Media** page (`/manage/media`) lets you upload, browse, and delete images and videos, and organise them into folders. Media is stored and served by [ImageKit](https://imagekit.io). This page documents the integration and how to configure it.

## Why ImageKit + direct upload

Uploads go **browser → ImageKit directly** using the [Upload File V2 API](https://imagekit.io/docs/api-reference/upload-file/upload-file-v2). They are **not** proxied through a Netlify Function, because functions have a ~6 MB request-body limit and short timeouts — unsuitable for video. The function's only job is to mint a short-lived **upload token** that authorizes the direct upload.

The ImageKit **private key never reaches the browser**: it is used server-side only, to sign upload tokens and to authenticate the Management API (list/delete).

## Configuration

Set these in Netlify (**Site settings → Environment variables**) or a local `.env`:

```
IMAGEKIT_PRIVATE_KEY     # Server-side only. Signs V2 tokens, authenticates the Management API.
IMAGEKIT_PUBLIC_KEY      # Embedded in the token header (kid) to identify the account.
IMAGEKIT_URL_ENDPOINT    # https://ik.imagekit.io/<your_imagekit_id>
IMAGEKIT_ROOT_DIR        # Optional base folder all media is scoped under, e.g. /simple-site
```

Find the keys in your ImageKit dashboard under **Developer options → API keys**.

### Root directory

`IMAGEKIT_ROOT_DIR` is a server-side base folder that scopes **every** media operation — uploads, listing, and folder create/delete are all resolved relative to it. It is created automatically on first upload. The browser only ever sees paths **relative** to this root (the admin breadcrumb's "Home" is the root), so the absolute ImageKit layout stays a server concern and media can be re-homed by changing one env var. Leave it blank or `/` to use the ImageKit account root.

Relative paths are sanitised server-side (`..` traversal is rejected) before being joined to the root.

## Upload flow (V2)

```
┌─ Browser (MediaPage) ──────────────────────────────────────────────┐
│ 1. User picks file(s)                                               │
│ 2. POST /api/media/upload-auth  { fileName }                        │
│        (Authorization: Bearer <nf_jwt> — admin only)                │
└───────────────┬────────────────────────────────────────────────────┘
                │
┌─ Netlify Function (MediaModule) ───────────────────────────────────┐
│ 3. Resolve folder = IMAGEKIT_ROOT_DIR + current path                │
│    Build canonical uploadPayload (folder, useUniqueFileName)        │
│ 4. Sign JWT with IMAGEKIT_PRIVATE_KEY:                              │
│      header  { alg: HS256, typ: JWT, kid: IMAGEKIT_PUBLIC_KEY }     │
│      payload { ...uploadPayload, iat, exp }   (exp ≤ iat + 3600s)   │
│      sig     HMAC-SHA256(headerB64 + "." + payloadB64, privateKey)  │
│ 5. Return { token, expire, publicKey, uploadPayload }              │
└───────────────┬────────────────────────────────────────────────────┘
                │
┌─ Browser → ImageKit (direct) ──────────────────────────────────────┐
│ 6. POST https://upload.imagekit.io/api/v2/files/upload             │
│      multipart: file + uploadPayload fields + token                 │
│      (XMLHttpRequest reports upload progress)                       │
│ 7. ImageKit verifies the JWT signs the exact payload → stores file  │
│ 8. MediaPage shows the file from the upload response (see below)    │
└─────────────────────────────────────────────────────────────────────┘
```

Because the JWT signs the whole payload, the client must send **exactly** the `uploadPayload` the server returned — hence the server returns the canonical payload and the client echoes it verbatim.

## Browse, folders & delete

- **List** — `GET /api/media?path=<relative>&type=<all|image|video>` proxies the ImageKit Management API (`GET /v1/files?type=all`, HTTP Basic auth) for the folder at `path`, and returns `{ folders, files }`. The UI filter narrows **files** (videos by MIME type); folders are always shown so you can navigate. Each item renders from the `url`/`thumbnail` the API returns, so no public key or URL endpoint is needed in the browser.
- **Folders** — `POST /api/media/folder { name, path }` creates a folder; `DELETE /api/media/folder?path=<relative>` deletes a folder **and all its contents** (confirmed in the UI). The Media page provides breadcrumb navigation, a "New folder" action, and per-folder delete.
- **Delete file** — `DELETE /api/media/:fileId` permanently removes a file and all its versions.

See [api.md](api.md#media-imagekit) for request/response shapes.

### Media page layout

The current folder's contents render in two sections:

- **Folders** — each folder is a rounded "chip" (folder icon + name); click to open, with a per-folder delete action.
- **Files** — a responsive grid of MUI cards. Each card has the thumbnail on top (video shows a play badge; the image links to the full asset), and below it the file name, a details line showing the **extension, size, and image dimensions (or video length)**, and **Copy name** / **Copy URL** / delete actions. Image dimensions come from the listing; video length is read from the player's `loadedmetadata` (ImageKit does not return it for videos).

### Refresh on acknowledgment

Folder **create** and file/folder **delete** re-list the current folder from the server once ImageKit acknowledges the operation, so the view always reflects server state. **Uploads** are the exception: the V2 upload response *is* ImageKit's acknowledgment and already carries the new file's `fileId`/`url`, so the file is shown straight from that response rather than re-listing — which avoids the list-index lag described below.

### Two ImageKit quirks worth knowing

- **`path` must keep literal slashes.** ImageKit's list API does **not** URL-decode `%2F`, so the function builds the `path` query with literal `/` separators (segment names are still encoded). Passing a `URLSearchParams`-encoded path silently returns zero results.
- **The list index is eventually consistent.** A file is not guaranteed to appear in `GET /v1/files` for ~1–2 s after upload. So after an upload the UI shows the new file directly from the **V2 upload response** (which already contains `fileId`/`url`) rather than re-listing — no refresh needed.

## Code map

| Concern | Location |
|---------|----------|
| Shared types (Zod) | `libs/interfaces/src/media.interface.ts` |
| Token signing + Basic auth | `apps/functions/src/handlers/imagekit/imagekitClient.ts` |
| Route handler | `apps/functions/src/handlers/MediaModule.ts`, `apps/functions/src/media.mts` |
| Frontend service | `apps/web/src/services/mediaService.ts` |
| Admin page | `apps/web/src/pages/admin/MediaPage.tsx` |

## Local development

`netlify dev` bypasses `AuthHandler` (sets `CONTEXT=dev`) and `VITE_AUTH_BYPASS=true` mocks the admin session, so `/manage/media` is reachable without a live Netlify Identity service. Real `IMAGEKIT_*` keys are still required in `.env` for uploads and listing to work.

## Notes & limits

- Uploads land in the currently-browsed folder (under `IMAGEKIT_ROOT_DIR`) with `useUniqueFileName` enabled.
- Upload tokens expire after 30 minutes (`exp = iat + 1800`, within ImageKit's 3600 s cap).
- Tag editing and a search UI are not built yet — they can be layered on the `tags` upload field and the ImageKit `searchQuery` parameter.
