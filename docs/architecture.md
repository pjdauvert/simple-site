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
| Storage | Netlify Blobs |

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

```
┌──────────────────────────────────────────────────┐
│  App starts                                      │
│  ↓                                               │
│  SiteConfigProvider                              │
│  ↓  (shows loading screen)                       │
│  GET /api/config → Zod (SiteConfigSchema)        │
│  ↓                                               │
│  Config in React Context                         │
│  ├─ ThemeProvider  (config.themes)               │
│  └─ AppRouter      (config.pages)                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  AppIntlProvider                                 │
│  (locale resolved from localStorage / browser)  │
│  ↓                                               │
│  GET /api/translations/:locale                   │
│    → Zod (I18nDictionarySchema)                  │
│  ↓                                               │
│  ReactIntlProvider with fetched messages         │
│  (re-fetches on every locale switch)             │
└──────────────────────────────────────────────────┘
```

Both fetches are validated by Zod; schema errors surface as a graceful error screen rather than a blank page.

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
User visits /admin
  → ProtectedRoute checks AuthContext
  → No session → redirect to /admin/login
  → LoginPage calls login(email, password)
  → @netlify/identity POSTs to /.netlify/identity/token
  → nf_jwt + nf_refresh cookies set; 'login' event fired
  → RealAuthProvider.onAuthChange updates user in context
  → Navigate to /admin
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
  │ oauth            │ /admin  (OAuth provider login complete)      │
  │ confirmation     │ /admin  (email confirmed, user logged in)    │
  │ email_change     │ /admin  (new email verified, user logged in) │
  │ recovery         │ /admin/reset-password                       │
  │ invite           │ /admin/accept-invite?token=<token>          │
  └──────────────────┴─────────────────────────────────────────────┘
```

**Recovery** (`/admin/reset-password`): The user is already authenticated but has not set a password yet. `ResetPasswordPage` calls `updateUser({ password })`. The `user_updated` event propagates back through `onAuthChange`, keeping `AuthContext` in sync.

**Invite** (`/admin/accept-invite?token=…`): The user has no session. `AcceptInvitePage` reads the token from query params and calls `acceptInvite(token, password)`, which logs the user in on success.

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
