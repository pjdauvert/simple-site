# Feature Specification: Simple Site — Baseline

**Feature Branch**: `main`  
**Created**: 2026-03-27  
**Status**: Implemented (retroactive documentation)  
**Input**: Existing codebase analysis

## User Scenarios & Testing

### User Story 1 — View a Config-Driven Website (Priority: P1)

A visitor navigates to the site and sees a fully rendered, multi-page website whose content, layout, and styling are entirely driven by a single JSON configuration file.

**Why this priority**: This is the core value proposition — without rendering, nothing else matters.

**Independent Test**: Load the app, verify the home page renders with hero section, text sections, and navigation based on `siteConfig.json`.

**Acceptance Scenarios**:

1. **Given** a valid `siteConfig.json`, **When** the app loads, **Then** it shows a loading screen followed by the home page with all configured sections rendered in order.
2. **Given** a config with 3 pages (Home, Calendar, About), **When** the app loads, **Then** the navigation menu shows 3 items and each routes to the correct page.
3. **Given** a section of type `hero`, **When** the page renders, **Then** a full-width hero with title, subtitle, and CTA button is displayed.
4. **Given** a section of type `text` with multiple columns and media, **When** the page renders, **Then** columns are displayed in the configured ratio with images positioned per `columnConfig`.

---

### User Story 2 — Switch Themes at Runtime (Priority: P2)

A user switches between available themes (e.g., Dark, Dark Blue) and the entire UI updates immediately — colors, backgrounds, menu styles, and link colors.

**Why this priority**: Theming demonstrates the config-driven architecture and is a core differentiator.

**Independent Test**: Click the theme switcher, verify all color tokens change across the page.

**Acceptance Scenarios**:

1. **Given** 2+ themes in config, **When** the user clicks the palette icon, **Then** a menu shows all available theme names.
2. **Given** the user selects "Dark Blue", **When** the theme switches, **Then** `backgroundColor`, `primaryColor`, `menuBackgroundColor`, and link colors all update.
3. **Given** only 1 theme in config, **When** the app loads, **Then** the theme switcher icon is hidden.
4. **Given** 0 themes in config, **When** the app loads, **Then** the hardcoded Default theme is used.

---

### User Story 3 — Switch Language (Priority: P2)

A user switches language (English ↔ French) and all translatable text updates in place without page reload.

**Why this priority**: i18n is fundamental for the target audience.

**Independent Test**: Switch to French, verify hero title, menu items, and footer text are translated.

**Acceptance Scenarios**:

1. **Given** the app in English, **When** the user switches to French, **Then** all `<FormattedMessage>` components render their French translation.
2. **Given** a missing translation key, **When** the page renders, **Then** it falls back to the `defaultMessage` from the config JSON.
3. **Given** the i18n map contains `en` and `fr`, **When** the language switcher opens, **Then** it shows "English" and "Français".

---

### User Story 4 — Responsive Mobile Experience (Priority: P2)

A user on a mobile device sees a properly adapted layout — hamburger menu, appropriately sized typography, hidden columns marked with `hideOnBreakpoints`, and no horizontal scroll.

**Why this priority**: Mobile-first is a core design principle.

**Independent Test**: Resize browser to 375px width, verify hamburger menu appears, columns marked for xs/sm hiding are invisible, and layout has no overflow.

**Acceptance Scenarios**:

1. **Given** viewport < 900px, **When** the menu renders, **Then** it shows a hamburger icon instead of inline buttons.
2. **Given** a column with `hideOnBreakpoints: ["xs", "sm"]`, **When** viewed on mobile, **Then** that column is hidden and remaining columns redistribute.
3. **Given** a parallax background section, **When** viewed on any breakpoint, **Then** text remains readable and no horizontal scrolling occurs.

---

### User Story 5 — Serverless Config API (Priority: P3)

An API consumer (future admin UI or CI pipeline) can GET the current site config and POST an updated config via Netlify Functions, with proper error handling and validation.

**Why this priority**: Enables future dynamic configuration management.

**Independent Test**: `GET /api/config` returns stored config; `POST /api/config` with valid JSON stores it; invalid JSON returns 400.

**Acceptance Scenarios**:

1. **Given** a stored config in Netlify Blobs, **When** `GET /api/config` is called, **Then** the config JSON is returned with 200.
2. **Given** no stored config, **When** `GET /api/config` is called, **Then** a 404 with `NOT_FOUND` error code is returned.
3. **Given** a valid JSON body, **When** `POST /api/config` is called, **Then** the config is stored and a success message returned.
4. **Given** invalid JSON in the body, **When** `POST /api/config` is called, **Then** a 400 with `INVALID_REQUEST` error code is returned.

---

### Edge Cases

- What happens when `siteConfig.json` has a Zod validation error? → Error screen with message is shown.
- What happens when a section type is unknown? → `PageSection` returns `null` (silent skip).
- What happens when `columnLayout` ratios don't match column count? → Remaining columns render at calculated proportional sizes.
- What happens with an empty `pages` array? → No routes are created; user sees a blank app.
- What happens when ImageKit URLs are unreachable? → Broken image placeholders; no app crash.

## Requirements

### Functional Requirements

- **FR-001**: System MUST render pages dynamically from a JSON configuration validated by Zod schemas.
- **FR-002**: System MUST support Hero and Text section types via discriminated union rendering.
- **FR-003**: System MUST support multi-column layouts with configurable ratios (`columnLayout`), media (cover/contain), and per-column design overrides.
- **FR-004**: System MUST support runtime theme switching with immediate UI update (no reload).
- **FR-005**: System MUST support i18n with `react-intl`, deterministic key construction (`{pageName}.{sectionName}.content.{field}`), and fallback to config defaults.
- **FR-006**: System MUST validate all config at runtime via `SiteConfigSchema.parse()` before rendering.
- **FR-007**: System MUST provide a responsive navigation with mobile hamburger menu (< md breakpoint).
- **FR-008**: System MUST lazy-load section components via `React.lazy()` + `Suspense`.
- **FR-009**: System MUST support markdown rendering in text section paragraphs via `react-markdown`.
- **FR-010**: System MUST provide a serverless API (`GET/POST /api/config`) using Netlify Functions with standardized error responses.
- **FR-011**: System MUST support responsive column hiding via `hideOnBreakpoints` with layout redistribution.
- **FR-012**: System MUST support background images with optional parallax effect on sections.
- **FR-013**: System MUST apply ImageKit URL transformations for responsive image optimization.

### Key Entities

- **SiteConfig**: Root configuration — contains `site`, `themes[]`, `pages[]`, `i18n`.
- **PageConfiguration**: A page with `pageName`, `route`, `menuTitle`, and `sections[]`.
- **SectionProps**: Discriminated union on `type` — currently `hero` | `text`.
- **ThemeConfig**: Color palette (primary, secondary, link, background, menu colors).
- **SiteThemeConfig**: Site-level metadata (name, logo, favicon, container width).
- **TextColumnContent/Design**: Per-column content (title, paragraph) and design (media, alignment, hiding).
- **I18n**: Record of locale → Record of key → translated string.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Config loading + validation + first meaningful paint in < 2 seconds on 3G.
- **SC-002**: All section types render correctly at xs, sm, md, lg, xl breakpoints without horizontal overflow.
- **SC-003**: Theme switch applies in < 100ms (no network call, pure client-side).
- **SC-004**: Language switch applies in < 100ms with all visible strings updated.
- **SC-005**: Zod validation error surfaces a human-readable error message, not a white screen.
- **SC-006**: Lighthouse mobile score ≥ 80 for Performance, ≥ 90 for Accessibility.

## Assumptions

- ImageKit is the CDN for all media assets (URL transformation format: `?tr=...`).
- Netlify is the deployment platform (Functions v2 + Blobs for config storage).
- Only `en` and `fr` locales are supported initially; adding more requires only i18n map entries.
- No authentication is required for the public-facing site.
- The config API (`POST /api/config`) has no authentication gate yet (future enhancement).
- Browser support targets ES2020+ (Chrome, Firefox, Safari, Edge — latest versions).
