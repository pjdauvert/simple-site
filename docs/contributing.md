# Contributing

## Guidelines

1. All tests must pass before opening a PR (`npm test`)
2. Follow the existing code style — ESLint and TypeScript strict mode are enforced by pre-commit hooks
3. Use mobile-first responsive design patterns (see [extending.md](extending.md))
4. Test on multiple screen sizes
5. Keep documentation in sync — update the relevant file(s) under `docs/` whenever a PR changes a user-visible capability, API endpoint, configuration schema, or architectural decision
6. **Show only applicable options** — in admin forms, an option that does not apply to the current context (e.g. a setting irrelevant to the selected display mode) is **hidden, not disabled**; its stored value survives the context switch and resurfaces with it. Disabled states are reserved for *temporary* conditions (invalid input, in-flight save). Preview aids — such as an orientation toggle — never hide design options: they simulate a different **user experience of the same parameters**, not a different design (first applied by the gallery Design tab)
7. **A form that edits the configuration DRAFT auto-saves — and owns no save button** — it writes on its own through the shared `useDraftAutoSave` hook (`apps/web/src/hooks/useDraftAutoSave.ts`): the value the editor loads is the baseline (loading never writes), an edit settles for 800 ms, then the editor's own save body runs — re-read the fresh draft, merge **only** this editor's own fields, validate, `PUT`/`POST` — so concurrent tabs can never clobber each other. Writes are serialised (an edit landing mid-write goes out right after it), a still-pending edit is flushed on unmount, and a failed write waits for the next edit instead of retrying in a loop. The only control such a form renders is the shared `<DraftSaveStatus {...state} />` indicator (`apps/web/src/components/manage/DraftSaveStatus.tsx`), bottom-right of the editor column: it reports *pending / saving / saved / failed* (brand `Loader`, never MUI's `CircularProgress`) and says nothing while idle. It **replaces both save notifications** — a draft save never toasts, neither on success nor on failure. A form whose current state the schema would reject passes `enabled: false` (empty theme name, duplicate name, out-of-range width, invalid route…) so the edit stays *pending* instead of hammering the API, and flags the offending field **on the spot** rather than after a failed save
8. **Direct-save forms keep the one shared save button** — the editors that write live, outside the draft → publish cycle (team, contact, translations), render their save action through the shared `StickySaveButton` (`apps/web/src/components/manage/StickySaveButton.tsx`). It has two shapes and picks between them itself: a round icon-only floating button while the form still scrolls (covering as little as possible of the content it hovers over), and the ordinary labelled button once the end of the form is reached, sitting in the flow where a form is expected to end. Both shapes carry the same icon and the same `page.manage.save` label — **one** save wording across the whole admin, never a per-editor one ("Save team", "Save contact"…). The component takes only `onClick`, `type`, `disabled` and `submitting`: pass those and nothing else — never a plain in-flow save button, never a bespoke label

## Tests — where they live

- Unit tests run with Vitest (`npm test`) and are colocated with the code they cover.
- **Serverless functions: never place a `*.test.ts` at the root of `apps/functions/src`.** Netlify treats every top-level file of the functions directory as a deployable function, so a root test file gets compiled into `dist/apps/functions/*.test.js` and loaded as a function module by `netlify dev` (it ends up bundled under `.netlify/functions-serve/…`). The functions build also excludes `**/*.test.ts` (`tsconfig.build.json`) as a second guard — typechecking still covers tests through `tsconfig.json`.
- **Function tests live at the `handlers/` level** (`apps/functions/src/handlers/*.test.ts`) and cover project logic only: modules, validation, gates (e.g. `featureGate.ts`, `AuthHandler.ts`).
- **Never test the framework.** The `*.mts` entrypoints are pure wiring — route → handler chain — and stay logic-free and untested by design; anything worth testing must be extracted into `handlers/` and tested there.

## Tests — shared kits

Each side owns its own test kit; they are never shared across the boundary (a
backend kit imports the serverless runtime, a frontend kit imports React), and
neither belongs in the shared interfaces package.

| Kit | Provides | Used by |
|-----|----------|---------|
| `apps/functions/src/handlers/testing/handlerTestKit.ts` | `stubEnv`/`BASE_ENV`, `stubFetch`, `makeStore` (in-memory blob store), `jsonRequest`, `readJson`, `makeContext` | handler tests |
| `apps/web/src/test/featureFlags.ts` | `featuresWith(...names)`, `mockFeatures(...names)`, `mockFeaturesLoading()` | anything reading feature flags |
| `apps/web/src/test/renderWithProviders.tsx` | `renderWithProviders(ui, { route, locale, messages, auth, notifications, theme })`, `TEST_THEME`, `TEST_USER` | any component/page test |

Rules of thumb:

- **A fixture that would have to change when a shared type changes belongs in a
  kit.** The flag set is the canonical case: `featuresWith('gallery')` derives
  from the production `ALL_DISABLED`, so adding a `FEATURE_*` flag touches one
  constant instead of every test that mocks the hook.
- **Domain fixtures stay in the test that owns them** — a stored site config, a
  team member, the Resend env. The kits hold *runtime doubles* and the *provider
  stack*, nothing feature-specific.
- The functions kit lives under `testing/`, which `tsconfig.build.json` excludes
  alongside `*.test.ts` — it imports Vitest and must never reach the bundle.
- `renderWithProviders` mounts only the providers the options name, so a
  component missing a provider still fails the way it would in the app.
- Module mocks (`vi.mock`) are hoisted per file and cannot come from a kit;
  keep them in the test, and let the kit supply the values. For the flags:
  `vi.mock('…/hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }))`,
  then `mockFeatures('gallery')` in `beforeEach`.

## Code Quality Commands

```bash
npm test             # Vitest unit tests
npm run test:ui      # Vitest with browser UI
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit across all projects
npm run audit        # dependency vulnerabilities (see below)
```

Pre-commit hooks (Lefthook) run `lint` and `typecheck` automatically. Do not bypass them with `--no-verify`.

### Reaching the dev server from another machine

`npm run dev` already listens on every interface at port 3080, so a reverse
proxy or another device on the network can reach it. Vite, however, rejects
`Host` headers it was not told about (*"Blocked request"*), so list the
hostnames the proxy uses in `DEV_ALLOWED_HOSTS` (comma-separated) in the
workspace `.env` — see `.env.example`.

Hot module reload rides a WebSocket on the same origin: the proxy must forward
the upgrade, otherwise the page loads fine but stops updating on save. For
nginx:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade    $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Suppressed runtime warnings

`npm run dev` / `npm run preview` set `NODE_OPTIONS=--disable-warning=DEP0060`.
The local proxy of the Netlify CLI still depends on `http-proxy@1`, unmaintained
since 2020, which calls the deprecated `util._extend` on **every** proxied
request — one warning per API call, drowning the dev log. The flag silences that
one deprecation code, never warnings at large; drop it when the CLI moves off
`http-proxy`.

### Dependency vulnerabilities

`npm run audit` is a merge gate, not a report: **no `high` or `critical` advisory is
allowed anywhere**, and the runtime tree (`--omit=dev`) must also be free of
`moderate` ones — what ships to visitors is held to the stricter bar.

When it fails:

1. `npm audit fix` first — it only moves within the declared ranges.
2. Still failing? Upgrade the offending tool to its fixed major and re-run every
   gate; the test runner and build toolchain are dev-only, but a broken toolchain
   is still a broken build.
3. If the only upgrade npm proposes is a **downgrade** (it does suggest those),
   pin the patched transitive version in `overrides` in `package.json` instead,
   with a comment-worthy entry in the PR description saying which advisory it
   closes. Never silence an advisory by lowering the gate.

## Continuous Integration

Every pull request runs the same gates in GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) on each pushed commit: install, dependency audit, lint, typecheck, tests, and build. A superseded run is cancelled when new commits arrive. All checks must pass before merge — fix the underlying issue rather than re-running.

## Browser Support

Modern browsers supporting ES6+ and React 19:

| Browser | Minimum |
|---------|---------|
| Chrome | latest |
| Firefox | latest |
| Safari | latest |
| Edge | latest |
| Mobile Safari | iOS 13.4+ |
| Chrome Mobile | Android 6+ |

React 19 requires more recent browser versions than React 18.

## Mobile Testing Checklist

Before merging any UI change:

- [ ] Touch targets are at least 44 × 44 px
- [ ] Text is readable without zooming (minimum 14 px)
- [ ] Navigation works with the hamburger menu on mobile
- [ ] Content adapts to portrait and landscape orientations
- [ ] Images and icons scale appropriately
- [ ] No horizontal scrolling on small screens
- [ ] Proper spacing for touch interactions

## Troubleshooting

### Node.js version issues

```bash
nvm install --lts
nvm use --lts
npm install -g npm@latest
```

### Testing on a real mobile device

```bash
# 1. Find your local IP
ifconfig        # macOS / Linux
ipconfig        # Windows

# 2. Start the dev server (app + API on one port)
npm run dev

# 3. Open http://YOUR_IP:3080 on the device (must be on the same network)
```

## Roadmap

- [ ] Assets management
- [ ] Configuration caching with cache invalidation
- [ ] Additional section types (calendar, bibliography, …) — the gallery and events shipped as flag-gated feature pages instead, not as section types
- [ ] Advanced responsive images with `srcset`
- [ ] Configuration edition mechanism
- [ ] Modules management (payment, authentication, external API access)
