# Media Management (ImageKit)

The admin **Media** page (`/manage/media`) lets you upload, browse, and delete images and videos. Media is stored and served by [ImageKit](https://imagekit.io). This page documents the integration and how to configure it.

## Why ImageKit + direct upload

Uploads go **browser → ImageKit directly** using the [Upload File V2 API](https://imagekit.io/docs/api-reference/upload-file/upload-file-v2). They are **not** proxied through a Netlify Function, because functions have a ~6 MB request-body limit and short timeouts — unsuitable for video. The function's only job is to mint a short-lived **upload token** that authorizes the direct upload.

The ImageKit **private key never reaches the browser**: it is used server-side only, to sign upload tokens and to authenticate the Management API (list/delete).

## Configuration

Set these in Netlify (**Site settings → Environment variables**) or a local `.env`:

```
IMAGEKIT_PRIVATE_KEY     # Server-side only. Signs V2 tokens, authenticates the Management API.
IMAGEKIT_PUBLIC_KEY      # Embedded in the token header (kid) to identify the account.
IMAGEKIT_URL_ENDPOINT    # https://ik.imagekit.io/<your_imagekit_id>
```

Find these in your ImageKit dashboard under **Developer options → API keys**.

## Upload flow (V2)

```
┌─ Browser (MediaPage) ──────────────────────────────────────────────┐
│ 1. User picks file(s)                                               │
│ 2. POST /api/media/upload-auth  { fileName }                        │
│        (Authorization: Bearer <nf_jwt> — admin only)                │
└───────────────┬────────────────────────────────────────────────────┘
                │
┌─ Netlify Function (MediaModule) ───────────────────────────────────┐
│ 3. Build canonical uploadPayload (folder /media, useUniqueFileName) │
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
│ 8. MediaPage re-lists media via GET /api/media                      │
└─────────────────────────────────────────────────────────────────────┘
```

Because the JWT signs the whole payload, the client must send **exactly** the `uploadPayload` the server returned — hence the server returns the canonical payload and the client echoes it verbatim.

## Browse & delete

- **List** — `GET /api/media` proxies the ImageKit Management API with HTTP Basic auth (private key as username). The UI filter (`all` / `image` / `video`) maps to the ImageKit `fileType` query (`image` / `non-image`); videos are further narrowed by MIME type. Each item is rendered from the `url`/`thumbnail` the API returns, so no public key or URL endpoint is needed in the browser.
- **Delete** — `DELETE /api/media/:fileId` permanently removes a file and all its versions. The UI confirms before deleting.

See [api.md](api.md#media-imagekit) for request/response shapes.

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

- Uploads land in the `/media` folder with `useUniqueFileName` enabled.
- Upload tokens expire after 30 minutes (`exp = iat + 1800`, within ImageKit's 3600 s cap).
- The current version uploads to a fixed folder and does not yet support folder navigation, tag editing, or search UI — these can be layered on the existing `searchQuery` support in `GET /api/media`.
