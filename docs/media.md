# Media Management (ImageKit)

The admin **Media** page (`/manage/media`) lets you upload, browse, and delete images and videos, and organise them into folders. Media is stored and served by [ImageKit](https://imagekit.io). This page documents the integration and how to configure it.

## The Media page at a glance

### Functionalities

- **Browse** the media library, scoped to a server-side root directory, with breadcrumb navigation (`Home → sub-folder → …`).
- **Upload** images and videos — drag-and-drop onto the zone *or* click it to browse; multiple files at once. Non-media files are rejected (`image/*` and `video/*` only).
- **Organise** into folders: create a folder, or delete a folder **and all its contents** (confirmed first).
- **Delete** a file (all versions), confirmed first.
- **Rename** a file or a folder (each item's **"more" menu** holds the rename and delete actions).
- **Multi-select** files (a checkbox on each file card) and **bulk-delete** the selection (confirmed first).
- **Copy** a file's name or its public URL to the clipboard.
- **Filter** the file grid by type: **All / Images / Videos**.
- **Sort** the file grid by **date added** (default), **name**, **size**, **width** or **height**, ascending or descending. Folders are always listed alphabetically.

### Display

The page is laid out top-to-bottom:

1. **Title** and a **breadcrumb** trail to the current folder.
2. An **error banner** (only when something fails; dismissible).
3. **Folders section** — an overline "Folders" label, then a wrapping row that *starts* with the **New folder** button, followed by one **folder chip** per sub-folder (rounded rectangle: folder icon + name; click to open, with a trailing **"more" menu** for rename / delete).
4. **Files section** —
   - a header with the "Files" label on the left and, on the right, the **sort control** (field selector + ascending/descending toggle) and the **type filter**;
   - the **drop zone** (dashed, rounded), labelled "Drag & drop files here, or click to browse" with an "Images and videos only" hint — which is **smoothly replaced by a selection toolbar** (the selected count with **Clear selection** and **Delete selected**) whenever any file is selected, and slides back once the selection is empty;
   - the **upload progress panel** while uploads are active (see below);
   - the **file grid** — a responsive grid of cards — or a centered message (`No media yet…` at the root, `No files match this filter` otherwise).
5. **Dialogs**: a delete confirmation (single or bulk), a rename prompt, and a new-folder prompt.

A **file card** shows a **select checkbox** in its top-right corner, the thumbnail on top (fit to the frame so the whole image/video is visible, not cropped; videos overlay a play badge and the thumbnail links to the asset), then the file **name**, a **details** line (`EXTENSION · SIZE · W×H` for images, or `· m:ss` length for videos), the **creation date**, and **Copy name / Copy URL** actions plus a **"more" menu** (rename / delete). A selected card is outlined in the primary colour. Image dimensions come from the listing; video length is read from the player's `loadedmetadata` (ImageKit doesn't return it for videos).

The **upload progress panel** is a framed box; each file is a framed row with a determinate progress ring (live %), the file name, and a trailing status action (see Behaviour).

### Behaviour

- **Direct, per-file uploads.** Each file uploads browser → ImageKit independently (its own `AbortController`). On success the file appears in the grid immediately — straight from the upload response — and its row shows a green **success check**. A failed or canceled row offers **Retry**; **Cancel** aborts only that file (others keep going). Once every row is in a final state (success / error / canceled), a **Dismiss** button clears the panel.
- **Optimistic display, reconciled with the server.** Uploaded files show at once because ImageKit's list index lags. Folder-create re-lists from the server on acknowledgment, while not-yet-indexed uploads are preserved; the most recent load always wins.
- **Cascade-in on display.** When a folder's contents are fetched, its folder chips and file cards animate in with a staggered fade-and-grow (`ItemTransition`) rather than appearing as one block — each item slightly after the previous (capped so long lists don't crawl in). The entrance is the exact inverse of the delete exit. The grid lives behind the loading spinner, so it remounts and re-cascades on every load (initial, filter change, navigation); a single just-uploaded file animates in on its own without disturbing the rest.
- **In-place delete.** Confirming a delete closes the dialog at once and animates the item out where it sits rather than refreshing the page: it is blurred + greyscaled with a concentric pulse loader over it until ImageKit acknowledges, then it fades out and minimizes (the inverse of the entrance) before being dropped from the list locally (no re-list). The deleted id is still kept hidden for a short grace window so a later re-list (filter change / navigation) can't resurrect it while the index lags.
- **Multi-select & bulk delete.** Each file card has a select checkbox (no background — a drop shadow keeps it legible over any thumbnail). Selecting one or more **replaces the drop zone with a selection toolbar** (a `Collapse` swap: the drop zone slides out as the toolbar slides in, and back again when the last item is deselected) showing the count and **Delete selected**. Confirming deletes every selected file with the same in-place animation as a single delete (each fades out independently as ImageKit acknowledges it). The selection is **reset on a filter change or folder navigation** (only), so it never carries stale ids across views; sorting keeps it. Folders are not multi-selectable.
- **In-place rename.** Each item's **"more" menu** opens a rename prompt pre-filled with the current name. On confirm the new name is applied to the item locally and the sort re-orders if needed — no re-list, because ImageKit's rename response carries no asset object and its list index lags. The name is sanitized client-side to mirror ImageKit's rules (files keep `A–Z a–z 0–9 . _ -`; folders keep letters/numbers and `-`; everything else becomes `_`), and for files the `filePath`/`url` are re-derived from the new name. A no-op rename just closes the prompt. Folder rename is an **async ImageKit bulk job**, so the new path may take a moment to be navigable even though the chip updates immediately.
- **The filter never traps you.** It narrows files only (folders always show), and the files section + filter always render, so you can always switch back from an empty filtered view.
- **Stable, client-side sorting.** Folders are always alphabetical; files default to **creation date ascending** so the newest sits last — which is why a just-uploaded file is appended (its V2 response carries no `createdAt`, so it sorts to the end) rather than jumping to the front. The grid can also be sorted by name, size, width or height in either direction; missing values sort last in ascending order, with the file name as a stable tie-breaker. Sorting is derived (`useMemo`) over the working set, so reordering never re-fetches.
- **Everything is relative to the root directory** — the browser never sees the absolute ImageKit path.

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
FEATURE_MEDIA            # Feature flag — "true" enables the whole Media library; anything else disables it.
```

Find the keys in your ImageKit dashboard under **Developer options → API keys**.

### Feature flag

The entire Media library is gated behind **`FEATURE_MEDIA`** — only when it is exactly `"true"` is the feature on. It gates **both ends**:

- **Server** — all `/api/media*` routes (listing, folders, delete, **and the upload-signature endpoint**) return `404` when off, regardless of auth (`apps/functions/src/media.mts` via `isMediaEnabled()` in `apps/functions/src/handlers/FeaturesModule.ts`).
- **Client** — the admin **Media** nav entry and `/manage/media` route render only when on. The flag is **not** a `VITE_*` build-time var; instead the client reads it at runtime from **`GET /api/features`** (`useFeatureFlags` in `apps/web/src/hooks/`, consumed by `ManageRouter`). If that request fails, the library is treated as disabled.

Because the value is read **at request time** on the server, flipping it needs **no rebuild** — only a redeploy (or, in local `netlify dev`, a restart so the new `.env` is picked up).

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

Each selected file uploads independently (its own `AbortController`), shown on its own framed row inside a framed progress panel: the `Loader` **determinate** ring (live percentage), the file name, and a status action — a **cancel** button while uploading, a **success check** once done, or a **retry** button if it failed or was canceled. Cancel/fail of one file leaves the others (and finished ones) untouched; canceling rejects with an `AbortError` (detected via `isUploadCanceled`) and is not surfaced as an error. Once **every** row reaches a final state (success / error / canceled) a **dismiss** button clears the panel.

## Browse, folders, rename & delete

- **List** — `GET /api/media?path=<relative>&type=<all|image|video>` proxies the ImageKit Management API (`GET /v1/files?type=all`, HTTP Basic auth) for the folder at `path`, and returns `{ folders, files }`. The UI filter narrows **files** (videos by MIME type); folders are always shown so you can navigate. Each item renders from the `url`/`thumbnail` the API returns, so no public key or URL endpoint is needed in the browser.
- **Folders** — `POST /api/media/folder { name, path }` creates a folder; `PUT /api/media/folder { path, newName }` renames a folder (proxies ImageKit's async `POST /v1/bulkJobs/renameFolder`); `DELETE /api/media/folder?path=<relative>` deletes a folder **and all its contents** (confirmed in the UI). The Media page provides breadcrumb navigation, a "New folder" action, and a per-folder "more" menu (rename / delete).
- **Rename file** — `PUT /api/media { filePath, newFileName }` renames a file (proxies ImageKit `PUT /v1/files/rename`). `filePath` is the file's absolute ImageKit path as surfaced in the listing.
- **Delete file** — `DELETE /api/media/:fileId` permanently removes a file and all its versions.
- **Deep-link to a folder** — the Media page reads a `?path=<relative>` query param on mount and opens at that folder (default: root). This lets other screens link straight to a folder — e.g. `ImagePickerDialog`'s **"Upload media"** button routes to `/manage/media?path=<current picker folder>`, so a user who can't find an image in the picker lands on the full page already at the folder they were browsing, ready to upload.

See [api.md](api.md#media-imagekit) for request/response shapes. The page's display and behaviour are summarised in [The Media page at a glance](#the-media-page-at-a-glance); the sections below cover the harder-won implementation details.

### Refresh on acknowledgment

Folder **create** re-lists the current folder from the server once ImageKit acknowledges the operation, so the view always reflects server state. **Delete** does not re-list: the item is animated out and dropped from local state in place (see *In-place delete* under Behaviour). The list index lags both operations by ~1–2 s, so `loadMedia` is hardened against it:

- **A deleted id is hidden from *every* re-list for a short grace window** (`recentlyDeletedRef`, ~5 s) — set when ImageKit acknowledges the delete — so a filter change or folder navigation inside the lag window won't re-list the stale item and resurrect it (even though the delete itself no longer triggers a re-list).
- **A `keepPending` refresh re-adds optimistic uploads the index hasn't caught up with.** After a create-folder re-list the listing can omit a just-uploaded file (the upload index lags ~15 s), so files present locally but absent from the fresh listing — and not in the deleted set — are kept.
- **Latest-wins:** each load carries a request id; a slow response whose id is stale is dropped, so overlapping re-lists (e.g. create-folder then quickly switch filter) can't overwrite newer state.

**Uploads** are shown straight from the V2 upload response — it *is* ImageKit's acknowledgment and already carries the new file's `fileId`/`url`, so no re-list is needed (and the much larger ~15 s upload-index lag is avoided).

### Two ImageKit quirks worth knowing

- **`path` must keep literal slashes.** ImageKit's list API does **not** URL-decode `%2F`, so the function builds the `path` query with literal `/` separators (segment names are still encoded). Passing a `URLSearchParams`-encoded path silently returns zero results.
- **The list index is eventually consistent.** A file is not guaranteed to appear in `GET /v1/files` for ~1–2 s after upload. So after an upload the UI shows the new file directly from the **V2 upload response** (which already contains `fileId`/`url`) rather than re-listing — no refresh needed.

## Delivery optimisation (URL transformations)

Every image the web app renders goes through the `ikTransform` / `ikSrcSet` helpers (`apps/web/src/utils/imagekit.ts`), which append [ImageKit URL transformations](https://imagekit.io/docs/image-transformation) so the visitor downloads a right-sized, auto-format rendition (`f-auto` → WebP/AVIF per browser) instead of the stored original:

- **Guarded, not blind** — transformations apply only to URLs served by ImageKit (`ik.imagekit.io`); relative paths and third-party hosts pass through untouched, a URL already carrying a `tr=` keeps its explicit transformation, and an existing query string is joined with `&` instead of a second `?`. (This replaced earlier blind `?tr=` appends.)
- **Thumbnails** are capped near their display size (2× for retina): media-library cards `w-400`, picker grid `w-200,h-200`, `MediaUrlField` preview `h-200` (it previously downloaded the original for a 100 px preview), admin list avatars `w-80,h-80`, team portraits `w-480,h-480,fo-face` (face-focused crop), menu-bar logo `h-64`.
- **Gallery lists** ship a responsive `srcSet` of width buckets with a `sizes` attribute (list shots 480→1920 w, theme covers 320→960 w), plus native `loading="lazy"` / `decoding="async"` below the fold — the first list shot stays eager as the likely LCP.
- **Gallery zoom** requests the smallest delivery bucket (960/1280/1920/2560) covering the viewport's larger dimension at the device pixel ratio (capped at 2×), and **prefetches the carousel neighbors** at the same rendition so the arrows feel instant.
- **Section images** are capped at `w-1600` (content images) and `w-1920,q-80` (full-bleed hero/text backgrounds).
- **Watermark** (gallery only, opt-in per [gallery design](configuration.md#gallery)) — a text layer burnt into the delivered rendition, never into the stored original: `l-text,ie-<base64>,fs-<px>,co-<RRGGBBAA>,lfo-<focus>,l-end`. Three ImageKit constraints shape the implementation (verified against the API): the text travels **base64-encoded** so any character is safe; `fs` must be an **absolute number** (arithmetic expressions like `fs-bw_mul_0.05` are rejected), so each rendition computes its own size from its width — which is exactly what keeps the mark proportional across a responsive `srcSet`; and the layer opacity parameter is rejected, so the opacity rides in the **color's alpha channel**.

If media is served from a custom ImageKit domain (CNAME) rather than `ik.imagekit.io`, the guard won't recognise it and images fall back to the original rendition — extend the host check in `apps/web/src/utils/imagekit.ts` in that case.

## Code map

| Concern | Location |
|---------|----------|
| Shared types (Zod) | `libs/interfaces/src/media.interface.ts` |
| Token signing + Basic auth | `apps/functions/src/handlers/imagekit/imagekitClient.ts` |
| Route handler | `apps/functions/src/handlers/MediaModule.ts`, `apps/functions/src/media.mts` |
| Frontend service | `apps/web/src/services/mediaService.ts` |
| Admin page (container: state + handlers) | `apps/web/src/pages/admin/MediaPage.tsx` |
| Presentational components | `apps/web/src/components/media/` (`FileCard`, `FolderChip`, `MediaItemMenu`, `CopyButton`, `DropZone`, `UploadProgressPanel`, `MediaBreadcrumbs`, `MediaTypeFilter`, `MediaSortControl`, `DeleteConfirmDialog`, `RenameDialog`, `NewFolderDialog`, `ItemTransition`) |
| Reusable pickers | `apps/web/src/components/media/` (`ImagePickerDialog` — browse-and-pick dialog with an "Upload media" shortcut that deep-links to `/manage/media?path=…`; `MediaUrlField` — URL/path field with an optional library picker as end adornment and a live preview thumbnail) |
| Sort / filter / rename helpers | `apps/web/src/components/media/mediaUtils.ts` (`sortFiles`, `sortFolders`, `matchesFilter`, `renameFileLocally`, `renameFolderLocally`, `sanitizeFileName`, `sanitizeFolderName`) |
| Delivery transformations | `apps/web/src/utils/imagekit.ts` (`ikTransform`, `ikSrcSet`, `ikZoomWidth` — see [Delivery optimisation](#delivery-optimisation-url-transformations)) |
| Shared media helpers / types | `apps/web/src/components/media/mediaUtils.ts`, `apps/web/src/components/media/types.ts` |

## Local development

`netlify dev` bypasses `AuthHandler` (sets `CONTEXT=dev`) and `VITE_AUTH_BYPASS=true` mocks the admin session, so `/manage/media` is reachable without a live Netlify Identity service. Real `IMAGEKIT_*` keys are still required in `.env` for uploads and listing to work.

## Notes & limits

- Files are added by dragging them onto the **drop zone** or clicking it to browse (the same V2 upload flow either way; dropped files are filtered to `image/*` and `video/*`).
- Uploads land in the currently-browsed folder (under `IMAGEKIT_ROOT_DIR`) with `useUniqueFileName` enabled.
- Upload tokens expire after 30 minutes (`exp = iat + 1800`, within ImageKit's 3600 s cap).
- Tag editing and a search UI are not built yet — they can be layered on the `tags` upload field and the ImageKit `searchQuery` parameter.
