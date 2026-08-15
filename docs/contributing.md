# Contributing

## Guidelines

1. All tests must pass before opening a PR (`npm test`)
2. Follow the existing code style — ESLint and TypeScript strict mode are enforced by pre-commit hooks
3. Use mobile-first responsive design patterns (see [extending.md](extending.md))
4. Test on multiple screen sizes
5. Keep documentation in sync — update the relevant file(s) under `docs/` whenever a PR changes a user-visible capability, API endpoint, configuration schema, or architectural decision
6. **Show only applicable options** — in admin forms, an option that does not apply to the current context (e.g. a setting irrelevant to the selected display mode) is **hidden, not disabled**; its stored value survives the context switch and resurfaces with it. Disabled states are reserved for *temporary* conditions (invalid input, in-flight save). Preview aids — such as an orientation toggle — never hide design options: they simulate a different **user experience of the same parameters**, not a different design (first applied by the gallery Design tab)
7. **The draft-save action is always visible, and always the same control** — every admin page/tab renders its save button through the shared `StickySaveButton` (`apps/web/src/components/manage/StickySaveButton.tsx`). It has two shapes and picks between them itself: a round icon-only floating button while the form still scrolls (covering as little as possible of the content it hovers over), and the ordinary labelled button once the end of the form is reached, sitting in the flow where a form is expected to end. Both shapes carry the same icon and the same `page.manage.save` label — **one** save wording across the whole admin, never a per-editor one ("Save menu", "Save team"…), so the control reads identically everywhere. The component takes only `onClick`, `type`, `disabled` and `submitting`: new admin editors pass those and nothing else — never a plain in-flow save button, never a bespoke label

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
```

Pre-commit hooks (Lefthook) run `lint` and `typecheck` automatically. Do not bypass them with `--no-verify`.

## Continuous Integration

Every pull request runs the same gates in GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) on each pushed commit: install, lint, typecheck, tests, and build. A superseded run is cancelled when new commits arrive. All checks must pass before merge — fix the underlying issue rather than re-running.

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

# 2. Start the dev server
npm run dev

# 3. Open http://YOUR_IP:5173 on the device (must be on the same network)
```

## Roadmap

- [ ] Assets management
- [ ] Configuration caching with cache invalidation
- [ ] Additional section types (gallery, calendar, event, bibliography, …)
- [ ] Advanced responsive images with `srcset`
- [ ] Configuration edition mechanism
- [ ] Modules management (payment, authentication, external API access)
