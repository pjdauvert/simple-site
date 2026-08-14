# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, Material-UI (MUI) |
| Language | TypeScript (strict mode) |
| Validation | Zod — runtime schemas + type inference |
| Routing | React Router (dynamic, config-driven) |
| i18n | React Intl |
| Markdown | React Markdown + remark-gfm (GitHub-flavored, shared `Markdown` component) |
| Build | Vite + Nx |
| Tests | Vitest |
| Linting | ESLint + Lefthook git hooks |
| Backend | Netlify Functions (TypeScript, NodeNext ESM) |
| Auth | Netlify Identity (`@netlify/identity`) |
| Storage | Netlify Blobs (published config + draft + archives, i18n), ImageKit (media) |
| Email | Resend (contact form relay) |

## Monorepo Layout

```
.
├─ apps/
│  ├─ web/            # Vite React SPA
│  └─ functions/      # Netlify Functions
├─ libs/
│  └─ interfaces/     # Shared Zod schemas & TypeScript types
├─ docs/              # Project documentation
├─ netlify.toml       # Build config + /api/* → /.netlify/functions/* redirect
├─ package.json       # Nx scripts (dev / build / test / lint / typecheck)
└─ tsconfig.base.json # Path alias @simple-site/interfaces → libs/interfaces
```

npm scripts delegate to Nx targets. Run `npm run dev`, `npm run build`, `npm test`, etc.

## Shared Interfaces (`libs/interfaces`)

All contracts shared between the frontend and the serverless functions live in `libs/interfaces` and are imported via the `@simple-site/interfaces` alias:

- Zod schemas for `SiteConfig` (site metadata, themes, pages, sections)
- Zod schemas for `I18n` (locale dictionaries)
- Section discriminated unions that drive type-safe rendering
- API response envelope types (`ApiResponseSuccessPayload`, `ApiResponseErrorPayload`)
- Shared `ErrorCode` enum for server-side error categorisation

Because the functions compile to native NodeNext ESM, the library re-exports every file with explicit `.js` extensions so the emitted JavaScript resolves correctly in Node without bundling.

**The package is strictly cross-boundary.** Only code genuinely consumed by BOTH sides belongs here: schemas, their inferred types, contract constants (key patterns, reserved routes, limits), and shared derivation rules (e.g. the i18n key collectors both the renderers and the Translations editor rely on). Helpers used by a single side do not — display/selection logic (`pickLocalizedText`, `memberSocialEntries`, design resolution, `reconcileMenu`, `slugify`…) lives in `apps/web` (e.g. `pages/team/teamDisplay.ts`, `router/publicMenu.ts`, the `components/manage/*` draft modules), and server-only helpers live in `apps/functions`. Types inferred from shared schemas stay with their schema even when only one side names them — the schema itself is the shared contract.

## Runtime Configuration Flow

Configuration and translations are fetched from the serverless API at startup — there is no static config file bundled with the frontend.

Configuration is versioned with a draft → publish model: the **live site** reads the **published** config (`GET /api/config`), while the `/manage` admin forms read and write the **draft** (`GET /api/config/draft`, `PUT /api/config/site`). Publishing (`POST /api/config/publish`) promotes the draft to live and archives the previous published config. See [configuration.md](configuration.md#versioning-draft--publish--archive).

```
┌──────────────────────────────────────────────────┐
│  App starts                                      │
│  ↓                                               │
│  SiteConfigProvider                              │
│  ↓  (shows loading screen)                       │
│  GET /api/config → Zod (SiteConfigSchema)        │
│  (published/live config)                         │
│  ↓                                               │
│  Config in React Context                         │
│  ├─ ThemeProvider  (config.themes)               │
│  └─ AppRouter      (config.pages)                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  /manage (admin, no SiteConfigProvider)          │
│  ManageLayout: left Drawer + top AppBar          │
│  ├─ /manage            Dashboard                  │
│  │    └─ ConfigVersionsPanel → GET /api/config/versions│
│  │                             POST /api/config/publish│
│  ├─ /manage/site       Site configuration (tabs) │
│  │    ├─ general  SiteSettingsForm → GET /api/config/draft│
│  │    │                             PUT /api/config/site │
│  │    ├─ themes   ThemesTab   → PUT /api/config/themes│
│  │    ├─ pages    PagesEditor → POST /api/config  │
│  │    └─ menu     MenuEditor  → PUT /api/config/menu│
│  ├─ /manage/gallery  GalleryEditor (FEATURE_GALLERY)│
│  │    └─ PUT /api/config/gallery — writes the draft│
│  ├─ /manage/team   Team (FEATURE_TEAM flag, tabs) │
│  │    ├─ page     TeamPageSettings (layout opts)  │
│  │    └─ members  TeamMembersEditor (people)      │
│  │    GET/PUT /api/team — direct save, own blob   │
│  ├─ /manage/translations  editor (overrides only)│
│  │    keys = config ∪ blob; add/import/remove lang│
│  │    GET /api/translations · PUT/DELETE /:locale │
│  └─ /manage/media  MediaPage (FEATURE_MEDIA flag) │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  AppIntlProvider                                 │
│  (locale from localStorage / browser)            │
│  ↓  GET /api/translations                         │
│    → { defaultLanguage, override languages }      │
│  GET /api/translations/:locale                   │
│    → Zod (I18nDictionarySchema)                  │
│  ↓  (empty values dropped → config default)       │
│  ReactIntlProvider with fetched messages         │
│  (re-fetches on every locale switch)             │
└──────────────────────────────────────────────────┘
```

Languages are **data-driven**, not compile-time: the available set is the config's **default language** (`config.site.defaultLanguage`, Zod-defaulted to `en`) plus the keys of the translations blob — the blob holds **override** languages only, since the default language's text lives in the site config itself (`GET /api/translations` returns `{ defaultLanguage, translations }`). Admins add / import / remove override languages from the Translations page without a code change; locale codes are any Intl-resolvable BCP-47 tag, stored canonicalized (`fr-CA`, `zh-Hant`). The default language is the fallback for an unknown locale (resolution: exact match → language-subtag match → config default) and is not removable. i18n keys are derived from the config's page/section structure by one shared helper (`collectI18nEntries` in `libs/interfaces`), used by both the public renderers and the editor.

Both fetches are validated by Zod; schema errors surface as a graceful error screen rather than a blank page.

The admin area (`/manage/*`) uses its own `ManageLayout` — a left navigation `Drawer` (permanent on desktop, foldable to an icons-only mini variant via an edge toggle whose state persists in `localStorage`; temporary/toggled on mobile) plus a top `AppBar` — so the public site keeps its standalone `MenuBar`. The drawer routes to the Dashboard (config versions), Site configuration (a tabbed page: General / Themes / Pages / Menu, addressed by URL sub-routes under `/manage/site`), the flag-gated Team, Contact and Gallery editors, Translations, and the flag-gated Media library.

The public navigation is resolved from the config's optional `menu` (ordered entries referencing config pages and feature pages, each with a visibility toggle, plus one-level `group` submenus — see [configuration.md](configuration.md#menu)) into a tree of **nav nodes** (`resolveNavTree` in `apps/web/src/router/publicMenu.ts`); configs without a `menu` fall back to the pages array order. Group nodes render as a popover on desktop and an accordion (or always-open section) inside the mobile menu; the rendering is **origin-agnostic** — `MenuBar` only reads resolved nodes, so a feature could contribute its own nodes without any nav change (the gallery contributes `galleryTag` leaf entries, resolved like any menu leaf). Feature pages (the flag-gated public pages shipped by optional features — `/team`, `/contact` and `/gallery` today) register their route/label in `apps/web/src/router/publicMenu.ts` and their routes in `AppRouter` ahead of the catch-all; the pages gate themselves on the runtime flags.

### Team

The Team feature (`FEATURE_TEAM`) stores members — name, photo URL (typically an ImageKit URL picked from the media library), per-locale job title and markdown biography, and a unique URL slug — in its **own blob** (key `team`), served by its own function (`team.mts` / `TeamModule`). Saves from `/manage/team` are **live immediately**: the team deliberately sits outside the config draft → publish cycle. Publicly, `/team` renders a 404 with no members, the single member's profile with one, and flat member rows (identification block + word-safe truncated biography whose ellipsis links to the member page) with several; each member also has `/team/member/<slug>`. Job titles and biographies follow the active locale and fall back to the base locale (stored inside the member record, independent of the translations blob); the member page adds its own language switch when the profile's texts exist in several languages.

### Contact

The Contact feature (`FEATURE_CONTACT`) ships a public `/contact` page — an email + message form (1000 characters max) for anonymous visitors — backed by its own function (`contact.mts` / `ContactModule`). Message sends store nothing: the payload is validated against the shared `ContactRequestSchema` and relayed to the site owner's inbox through the [Resend](https://resend.com) API (the visitor's address becomes the reply-to; the message is sent as plain text). The page settings — an optional presentation message (markdown) shown above the form — live in their **own blob** (key `contact`), edited from `/manage/contact` with a direct-save lifecycle like the team. The stored text is a translation DEFAULT under the `contact.presentation` key: `collectContactI18nEntries` merges it into the Translations editor (the config walk can't see it), and the admin field carries a Translate shortcut deep-linking there. See [api.md](api.md#contact) for the endpoint contract and required environment variables.

### Gallery

The Gallery feature (`FEATURE_GALLERY`) organises media-library images with **tags**: an immutable id (plain alphanumerics plus `-`/`_` — also the collection's URL and i18n-key segment) behind a translatable `displayName`/`description`; items carry any number of tags, and deleting a tag cascades to its references (items stay). Unlike the team/contact it has **no blob of its own**: the gallery lives inside the site config (optional `gallery` attribute), follows the **draft → publish** cycle, and is edited from `/manage/gallery` through the granular `PUT /api/config/gallery` — the endpoint 404s (before auth) while the flag is off, but the stored attribute keeps being served by `GET /api/config`; only its interpretation is gated, client-side. Publicly, `/gallery` browses the whole gallery and `/gallery/tag/<tag>` one tag's collection, in the design's **display mode** — centered list, card grid, masonry mosaic, or team-style alternating rows — with the caption side (above/below/left/right) as a second, list-mode-only design setting — grid always captions below, mosaic shows no caption, alternate places it itself (the Design tab shows a symbolic skeleton preview of the picked design); clicking a shot opens a fullscreen **zoom carousel** (wrap-around arrows + keyboard). The editor is a two-tab page (`/manage/gallery/items` — tags and thumbnail-managed items; `/manage/gallery/design`), each tab saving over a fresh draft read so they never clobber each other. **Items without an image are never rendered**, and a collection with nothing displayable 404s and leaves the nav. Nothing joins the navigation automatically: the admin links the root (`feature` entry) and each collection (`galleryTag` entry) from the Menu tab; tag names, descriptions and item captions are translation defaults collected by `collectGalleryI18nEntries` while the flag is on (item keys are positional). See [configuration.md](configuration.md#gallery).

### Pages editor — in-place editing

The **Pages** tab edits page content directly on a live preview rendered by the *real* section components. Each renderer declares its editable fields as slots (`EditableText` / `EditableMarkdown` / `EditableImage` in `components/sections/`) keyed by the same content path the i18n collector uses; a slot reads an optional `SectionEditContext` (via `useAppTheme`-style context) — absent on the public site (it renders plain, unchanged), present when a section is selected in the editor (it becomes an in-place field inheriting the surrounding typography). Design & structure that has no place on the canvas (layout, colours, breakpoints, add/remove of repeatable items) live in a bottom sheet docked under the preview; page settings (route, page name, delete) are a dialog. Markdown paragraphs use a lazy-loaded [Lexical](https://lexical.dev) rich-text surface that serialises to the same Markdown string stored in the config — kept in its own `lexical-vendor` chunk so it never reaches the public bundle. Inline edits and the design forms both emit through each section type's `normalize` (registry) so the saved section is always schema-clean. Saving still writes the whole draft via `POST /api/config`.

## Media Management

The admin **Media** page (`/manage/media`) manages images and videos stored in [ImageKit](https://imagekit.io). Uploads go **browser → ImageKit directly** via the Upload File V2 API — never proxied through a function (videos exceed the ~6 MB function body limit). A Netlify Function (`MediaModule`) mints a short-lived JWT that signs the upload payload; the ImageKit private key stays server-side. Browse/delete are proxied through the same admin-only function using the ImageKit Management API.

```
Browser ──POST /api/media/upload-auth──▶ MediaModule ──signs JWT (private key)──▶ { token }
Browser ──multipart file + payload + token──▶ https://upload.imagekit.io/api/v2/files/upload
Browser ──GET /api/media · DELETE /api/media/:fileId──▶ MediaModule ──Basic auth──▶ ImageKit Management API
```

See [media.md](media.md) for the full flow, configuration, and code map.

## Mobile-First Responsive Design

The app uses MUI breakpoints with a mobile-first approach:

| Breakpoint | Width | Target |
|-----------|-------|--------|
| `xs` | 0 px+ | Phones |
| `sm` | 600 px+ | Large phones / small tablets |
| `md` | 900 px+ | Tablets |
| `lg` | 1200 px+ | Desktops |
| `xl` | 1536 px+ | Large desktops |

Responsive values are applied via the `sx` prop:

```typescript
sx={{
  fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
  padding:  { xs: 2,      sm: 3,         md: 4 },
}}
```

## Authentication Flow

The admin area is protected by [Netlify Identity](https://docs.netlify.com/security/secure-access-to-sites/identity/) via the `@netlify/identity` library. There are two distinct entry points: email/password login, and email link callbacks (recovery, invite, confirmation, email-change, OAuth).

### Normal login

```
User visits /manage
  → ProtectedRoute checks AuthContext
  → No session → redirect to /auth
  → LoginPage calls login(email, password)
  → @netlify/identity POSTs to /.netlify/identity/token
  → nf_jwt + nf_refresh cookies set; 'login' event fired
  → RealAuthProvider.onAuthChange updates user in context
  → Navigate to /manage
```

### Email link callbacks (`NetlifyCallbackHandler`)

Netlify Identity emails (invitations, password recovery, confirmations, email-change verifications) redirect the user to the site root with an auth token in the URL hash. `NetlifyCallbackHandler` wraps the `/` route in `App.tsx` and processes these tokens on page load via `handleAuthCallback()`.

```
User clicks email link → lands on /#<type>_token=...
  → NetlifyCallbackHandler detects auth hash
  → calls handleAuthCallback()
  → result.type determines the next page:

  ┌──────────────────┬─────────────────────────────────────────────┐
  │ result.type      │ Destination                                 │
  ├──────────────────┼─────────────────────────────────────────────┤
  │ oauth            │ /manage  (OAuth provider login complete)     │
  │ confirmation     │ /manage  (email confirmed, user logged in)   │
  │ email_change     │ /manage  (new email verified, user logged in)│
  │ recovery         │ /auth/reset-password                        │
  │ invite           │ /auth/accept-invite?token=<token>           │
  └──────────────────┴─────────────────────────────────────────────┘
```

**Recovery** (`/auth/reset-password`): The user is already authenticated but has not set a password yet. `ResetPasswordPage` calls `updateUser({ password })`. The `user_updated` event propagates back through `onAuthChange`, keeping `AuthContext` in sync.

**Invite** (`/auth/accept-invite?token=…`): The user has no session. `AcceptInvitePage` reads the token from query params and calls `acceptInvite(token, password)`, which logs the user in on success.

### Session hydration

`RealAuthProvider` (in `AuthProvider.tsx`) subscribes to `onAuthChange` for the lifetime of the app, keeping `AuthContext` current across all flows. On reload, it calls `getUser()`, which hydrates from the `nf_jwt` cookie set by the identity library. `getNetlifyToken()` is exported at module level so `apiService.ts` can read the current JWT outside the React component tree.

### API protection

```
POST /api/config  or  POST /api/translations/:language
  → Authorization: Bearer <nf_jwt> sent by apiService
  → Netlify edge verifies JWT → context.clientContext.user populated
  → AuthHandler checks context.clientContext.user
  → Absent → 401 UNAUTHORIZED
  → Present → delegates to ConfigModule / TranslationsModule
```

### Local dev bypass

Set `VITE_AUTH_BYPASS=true` to activate `MockAuthProvider`, which stores a mock user in `sessionStorage`. No Netlify Identity endpoint is contacted. Any email value is accepted as login.
