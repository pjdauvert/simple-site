# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, Material-UI (MUI) |
| Language | TypeScript (strict mode) |
| Validation | Zod — runtime schemas + type inference |
| Routing | React Router (dynamic, config-driven) |
| i18n | React Intl |
| Markdown | React Markdown |
| Build | Vite + Nx |
| Tests | Vitest |
| Linting | ESLint + Lefthook git hooks |
| Backend | Netlify Functions (TypeScript, NodeNext ESM) |
| Auth | Netlify Identity (`@netlify/identity`) |
| Storage | Netlify Blobs (published config + draft + archives, i18n), ImageKit (media) |

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
│  │    └─ pages    PagesEditor → POST /api/config  │
│  ├─ /manage/translations  editor (per-language) │
│  │    keys = config ∪ blob; add/import/remove lang│
│  │    GET /api/translations · PUT/DELETE /:locale │
│  └─ /manage/media  MediaPage (FEATURE_MEDIA flag) │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  AppIntlProvider                                 │
│  (locale from localStorage / browser)            │
│  ↓  GET /api/translations → available languages   │
│  GET /api/translations/:locale                   │
│    → Zod (I18nDictionarySchema)                  │
│  ↓  (empty values dropped → config default)       │
│  ReactIntlProvider with fetched messages         │
│  (re-fetches on every locale switch)             │
└──────────────────────────────────────────────────┘
```

Languages are **data-driven**, not compile-time: the available set is the keys of the translations blob (`GET /api/translations`), so admins add / import / remove languages from the Translations page without a code change. `en` is the base locale (always present, the fallback for an unknown locale, not removable). i18n keys are derived from the config's page/section structure by one shared helper (`collectI18nEntries` in `libs/interfaces`), used by both the public renderers and the editor.

Both fetches are validated by Zod; schema errors surface as a graceful error screen rather than a blank page.

The admin area (`/manage/*`) uses its own `ManageLayout` — a left navigation `Drawer` (permanent on desktop, toggled on mobile) plus a top `AppBar` — so the public site keeps its standalone `MenuBar`. The drawer routes to the Dashboard (config versions), Site configuration (a tabbed page: General / Themes / Pages, addressed by URL sub-routes under `/manage/site`), Translations, and the flag-gated Media library.

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
