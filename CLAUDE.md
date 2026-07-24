# CLAUDE.md

This project is a white-label, config-driven site engine: a mobile-first single-page
web application whose pages, sections, themes, and languages are entirely described
by a runtime configuration served from a serverless API. **All project specifics —
including every framework, provider, and stack choice — live in `docs/`; read the
relevant doc before implementing. This file only indexes and sets process.**

## Documentation (source of truth)

| Topic | File |
|-------|------|
| Tech stack, monorepo layout, runtime config / i18n / auth flows | [docs/architecture.md](docs/architecture.md) |
| API reference — endpoints, response envelope, auth matrix, env vars | [docs/api.md](docs/api.md) |
| Configuration — site schema, themes, pages, draft → publish → archive, translations | [docs/configuration.md](docs/configuration.md) |
| Extending — new section types (step-by-step workflow), mobile-first patterns | [docs/extending.md](docs/extending.md) |
| Media — upload pipeline, feature flag, code map | [docs/media.md](docs/media.md) |
| Contributing — quality gates, mobile checklist, roadmap | [docs/contributing.md](docs/contributing.md) |

## Specialized agents

| Agent | File | Purpose |
|-------|------|---------|
| Platform Architect | `.claude/agents/platform-architect.md` | Architecture, API design, boundaries, render-by-configuration invariants |
| Modules Engineer | `.claude/agents/modules-engineer.md` | Optional features: flags end-to-end, module shape, off-state QA |
| MVP Engineer | `.claude/agents/mvp-engineer.md` | Full-stack implementation with reviewable deliverables |
| i18n Specialist | `.claude/agents/i18n-specialist.md` | Translation completeness, key discipline, locale quality |
| QA Engineer | `.claude/agents/qa-engineer.md` | Test coverage: handlers, render-locks, schemas, mobile checklist |
| Theme Designer | `.claude/agents/theme-designer.md` | Config-driven theming, mobile-first responsive, accessibility |
| Docs Curator | `.claude/agents/docs-curator.md` | Docs-in-lockstep rule, doc map, knowledge boundary |

## Hard rules

1. **Render-by-configuration** — no hardcoded pages, routes, labels, or brand content
   in the web app; structure comes from config, text from i18n. A site owner never
   needs a code change.
2. **Contracts live in the shared interfaces package** (`libs/interfaces`) —
   runtime-validated schemas + inferred types imported by both sides, under the
   module-resolution conventions in [docs/architecture.md](docs/architecture.md).
   Every backend response uses the shared envelope and error-code enum
   ([docs/api.md](docs/api.md#response-envelope)).
3. **i18n on every new page** — static labels in the web app's bundled label
   dictionary (every platform-chrome language), rendered through the i18n layer;
   keys match `/^[a-zA-Z0-9_.]+$/` with camelCase segments.
4. **Optional features ship flag-gated** — server-side `FEATURE_*` env var, reported
   by `GET /api/features`, routes 404 before auth when off, every UI surface hidden
   (see `.claude/agents/modules-engineer.md`).
5. **Docs in the same PR** — any change to an endpoint, config schema, user-visible
   capability, or architecture updates the matching `docs/` file(s). No follow-ups.

## Dev process (CI will hold you to it)

Before concluding any task or pushing:

```bash
npm test             # unit tests across all workspaces
npm run lint         # lint
npm run typecheck    # type checks across all workspaces
```

Git pre-commit hooks run lint + typecheck — **never bypass with `--no-verify`**.
Fix the cause, not the hook.

## Git workflow

- Never commit directly on `develop` or `main` — always a feature branch.
- Branch from up-to-date develop: `git checkout develop && git pull origin develop`
  before creating any branch.
- Branch names: `feat/<desc>`, `fix/<desc>`, `chore/<desc>` … in kebab-case; scope
  goes in the commit message, not the branch name.
- Integrate develop with `git rebase origin/develop`, never `git merge`.
- When implementing a plan: create the branch at the start and open a **draft PR**
  right after the first commit.
