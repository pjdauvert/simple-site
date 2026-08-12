# Extending the Application

## Adding a New Section Type

Sections are typed via a Zod discriminated union on the `type` field, shared between the frontend and the functions. A section type is defined in two places, and both keep each type self-contained (nothing about a section leaks into a central switch):

- **Contracts** — `libs/interfaces/src/sections/<type>.section.interface.ts`: the schema plus a collector declaring which content fields are translatable.
- **UI** — `apps/web/src/components/sections/<type>/`: the renderer, normalizer and editor, colocated in a per-type folder. Shared editing primitives (`EditableText`, `EditableImage`, `EditableMarkdown`, `InlineControls`, `registry.ts`, `sectionEdit.ts`) live one level up at `components/sections/`.

**How editing works** — the renderer is the *single source of layout*, used by both the public site and the admin live preview. There is no separate preview markup:

- **Content** (text, markdown, images) is edited **in place on the rendered section**. The renderer declares each editable field as a *slot* (`EditableText` / `EditableMarkdown` / `EditableImage`); a slot reads an optional `SectionEditContext` — absent on the public site (it renders plain), present when the section is selected in the editor (it becomes an in-place field).
- **Section-level design** (layout, colours, background) is edited in a small panel that opens **below the selected section**, from the section's floating toolbar. That panel renders the section's `*.editor.tsx`.
- **Per-item design** and **add/remove of repeatable items** happen via floating controls on the canvas (`InlineDesignPopover`, `InlineAddButton`).

### 1. Register the type — `libs/interfaces/src/sections/section.interface.ts`

```typescript
export const SectionTypesEnum = {
  HERO: 'hero',
  TEXT: 'text',
  NEW:  'new', // ← add here
} as const;
```

`section.interface.ts` also holds the shared i18n primitives every section reuses — `sectionContentKey`, the `createSectionI18n` accumulator, the `SectionI18nCollector` type, and `I18nEntry`.

### 2. Define the schema **and its i18n collector** — `libs/interfaces/src/sections/new.section.interface.ts`

Create a dedicated file (mirroring `hero.section.interface.ts` / `text.section.interface.ts`) with the content / design / props schemas, and a `collect<Type>I18n` collector that declares which content fields are translatable. Keeping the collector next to the schema means the central extractor never has to know a section's internals.

```typescript
import { z } from 'zod';
import {
  BaseSectionDesignSchema,
  BaseSectionPropsSchema,
  SectionTypesEnum,
  createSectionI18n,
  type SectionI18nCollector,
} from './section.interface.js';

const NewContentSchema = z.object({
  title:  z.string().optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional() })),
});

const NewDesignSchema = BaseSectionDesignSchema.extend({
  columns: z.number().optional(),
});

export const NewSectionPropsSchema = BaseSectionPropsSchema.extend({
  type:    z.literal(SectionTypesEnum.NEW),
  content: NewContentSchema,
  design:  NewDesignSchema.optional(),
});

export type NewSectionProps = z.infer<typeof NewSectionPropsSchema>;

/** Translatable strings of a new section: its title + each image's alt text. */
export const collectNewI18n: SectionI18nCollector<NewSectionProps> = ({ content }, scope) => {
  const { entries, add } = createSectionI18n(scope);
  add('title', content.title);
  content.images.forEach((img, i) => add(`images.${i}.alt`, img.alt));
  return entries;
};
```

`add(path, value)` records a `(scoped key → value)` entry and skips empty/absent values. The `path` it uses (e.g. `title`, `images.0.alt`) is exactly the `path` the renderer's editable slot passes (step 5) — `sectionContentKey(scope, path)` builds the same `${scope}.content.${path}` key on both sides, so the two never drift.

Then export the new file from `libs/interfaces/src/sections/index.ts`:

```typescript
export * from './new.section.interface.js';
```

### 3. Add to the discriminated union — `libs/interfaces/src/page.interface.ts`

```typescript
export const SectionPropsSchema = z.discriminatedUnion('type', [
  HeroSectionPropsSchema,
  TextSectionPropsSchema,
  NewSectionPropsSchema, // ← add here
]);
```

Also extend the `SectionProps<T>` conditional type:

```typescript
export type SectionProps<T extends SectionTypeValue> =
  T extends typeof SectionTypesEnum.HERO ? HeroSectionProps :
  T extends typeof SectionTypesEnum.TEXT ? TextSectionProps :
  T extends typeof SectionTypesEnum.NEW  ? NewSectionProps  : // ← add here
  never;
```

### 4. Dispatch the collector — `libs/interfaces/src/i18n.keys.ts`

`collectI18nEntries` walks the config, handles page menu titles, and delegates each section to its type's collector. Add a case for the new type:

```typescript
switch (section.type) {
  case SectionTypesEnum.HERO: collectHeroI18n(section, scope).forEach(push); break;
  case SectionTypesEnum.TEXT: collectTextI18n(section, scope).forEach(push); break;
  case SectionTypesEnum.NEW:  collectNewI18n(section, scope).forEach(push);  break; // ← add here
}
```

This dispatch is the **only** central i18n touch-point — the field details stay in the section file. It keeps the public renderers and the admin Translations editor deriving the *same* keys, so the editor never shows false "missing / extra" warnings for the new section.

### 5. Create the renderer with editable slots — `apps/web/src/components/sections/new/NewSection.tsx`

Declare each editable field as a slot instead of a hard-coded `<FormattedMessage>` / `<img>`:

- `EditableText` — a plain / multi-line string (`path`, `value`, `multiline?`, `autoWidth?`).
- `EditableMarkdown` — a Markdown body (rendered publicly through the shared `Markdown` component — GitHub-flavored markdown with MUI-styled tables and SPA-aware links; a lazy-loaded rich-text surface while editing).
- `EditableImage` — an image (`designPath`, `src`, `alt?`); clicking it while editing opens the media library.

Each renders exactly as before on the public site (config value = i18n *default*, a translation for the scoped key wins, empty renders nothing) and becomes an in-place field when a `SectionEditContext` is present. Wrap optional fields in `useSlotVisible()` so an empty field still renders (as a ghost placeholder) while editing — otherwise there'd be nothing to click.

Inside the admin **Pages preview** these text/markdown slots always show the **original config value untranslated**, whether or not their section is the selected (editable) one — a `SectionPreviewContext` makes them bypass `FormattedMessage`. The admin is editing the source config, so the `/manage` language switcher must not re-translate the previewed content; and since the manage area never loads the site's content translations, going through `FormattedMessage` there would only fall back to the same value while flooding the console with `MISSING_TRANSLATION`. New text/markdown slots get this for free by rendering through `EditableText` / `EditableMarkdown`.

```typescript
import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import type { NewSectionProps } from '@simple-site/interfaces';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { EditableText } from '../EditableText';
import { EditableImage } from '../EditableImage';
import { useSlotVisible } from '../sectionEdit';

export const NewSection: React.FC<NewSectionProps> = ({ sectionName, content }) => {
  const { siteThemeConfig } = useAppTheme();
  const showSlot = useSlotVisible();
  return (
    <Box>
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        {showSlot(content.title) && (
          <Typography variant="h2">
            <EditableText sectionName={sectionName} path="title" value={content.title} multiline />
          </Typography>
        )}
        {content.images.map((img, i) => (
          <EditableImage key={i} designPath={`images.${i}.url`} src={img.url} alt={img.alt ?? ''} />
        ))}
        {/* one Editable* slot per key the collector emits */}
      </Container>
    </Box>
  );
};
```

Repeatable items and on-canvas design controls are added here too — see step 8.

### 6. Add a normalizer — `apps/web/src/components/sections/new/NewSection.normalize.ts`

Both the section editor and inline edits emit through one canonicaliser that drops empty optional fields (and omits empty arrays/objects) so the section always serializes clean — mirror `hero/HeroSection.normalize.ts` / `text/TextSection.normalize.ts`:

```typescript
import type { NewSectionProps } from '@simple-site/interfaces';

export const normalizeNewSection = (section: NewSectionProps): NewSectionProps => {
  /* build a fresh object keeping only non-empty fields */
  return section;
};
```

### 7. Create the section editor — `apps/web/src/components/sections/new/NewSection.editor.tsx`

This is **section-level design only** — it renders in the panel below the selected section and handles what has no place on the canvas (layout, colours, background). Content, per-item design and add/remove of items are all edited on the canvas, so they are **not** duplicated here. It's a controlled component typed by `SectionEditorProps<'new'>` (from `registry.ts`) that always emits through your normalizer. Group related fields under `Typography` subheadings. Use `ColorField` (from `../../manage/themes/ColorField`) for colours and `MediaUrlField` with `preview={false}` (from `../../media/MediaUrlField`, gated on the `media` feature flag) for image URLs, since the image already shows on the section. Labels use `react-intl`, id-only, under `page.manage.pages.section.new.*`.

```typescript
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { NewSectionProps } from '@simple-site/interfaces';
import type { SectionEditorProps } from '../registry';
import { normalizeNewSection } from './NewSection.normalize';
import { ColorField } from '../../manage/themes/ColorField';

type NewDesign = NonNullable<NewSectionProps['design']>;

export const NewSectionEditor: React.FC<SectionEditorProps<'new'>> = ({ value, onChange }) => {
  const intl = useIntl();
  const t = (suffix: string) => intl.formatMessage({ id: `page.manage.pages.section.new.${suffix}` });
  const setDesign = (patch: Partial<NewDesign>) =>
    onChange(normalizeNewSection({ ...value, design: { ...value.design, ...patch } }));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" gutterBottom><FormattedMessage id="page.manage.pages.section.new.group.background" /></Typography>
        <ColorField label={t('backgroundColor')} value={value.design?.backgroundColor ?? ''} onChange={(v) => setDesign({ backgroundColor: v })} />
      </Box>
    </Stack>
  );
};
```

### 8. (Optional) On-canvas design & repeatable items

If the section has per-item design or repeatable lists, wire the controls into the **renderer** (step 5). They read the editing context via `useSectionEdit()` and render `null` on the public site, so they are safe to include unconditionally:

- **`InlineAddButton`** — an inline "+" for a repeatable `content` list: `<InlineAddButton contentPath="images" blank={{ url: '' }} label={t('addImage')} />`.
- **`InlineDesignPopover`** — a floating gear over an element that opens a popover holding that item's design panel. The item's element must be `position: relative`. Because a design panel may pull in heavier UI (e.g. `MediaUrlField`), keep it in a separate module and **lazy-import** it so it stays out of the public section chunk:

```typescript
const ItemDesignPanel = lazy(() => import('./NewDesignPanels').then((m) => ({ default: m.ItemDesignPanel })));
// …inside the item, which is position: relative:
{edit && (
  <InlineDesignPopover corner="bottom-right" label={t('image.settings')}>
    <Suspense fallback={null}><ItemDesignPanel index={i} /></Suspense>
  </InlineDesignPopover>
)}
```

The design panel (`new/NewDesignPanels.tsx`) is admin-only and controlled through the same context. `useSectionEdit()` exposes:

- `setContentAt(path, value)` / `setDesignAt(path, value)` — patch a dotted path within `content` / `design`.
- `addItemAt(contentPath, blank)` / `removeItemAt(contentPath, index)` — repeatable lists.
- `pickImageAt(designPath)` / `canPickImage` — open the media library and write the chosen URL.
- `mutate(fn)` — the escape hatch for compound edits a single path can't express (e.g. removing an item together with its index-aligned design entries).

Every op runs the result through the type's `normalize`, so an inline edit produces exactly the object the editor would.

### 9. Register in the section registry — `apps/web/src/components/sections/registry.ts`

The registry is the single dispatch point: the public renderer (`apps/web/src/pages/dynamic/PageSection.tsx`), the admin **Pages editor** (`/manage/site/pages`), and the add-section picker all read from it. Add one entry — a lazy renderer, a lazy editor, an icon, a label key, a `createDefault` factory for a blank schema-valid section, and the `normalize` function:

```typescript
const NewRenderer = lazy(() => import('./new/NewSection').then((m) => ({ default: m.NewSection })));
const NewEditor   = lazy(() => import('./new/NewSection.editor').then((m) => ({ default: m.NewSectionEditor })));

const newDefinition: SectionDefinition<'new'> = {
  type: SectionTypesEnum.NEW,
  labelKey: 'page.manage.pages.sectionType.new',
  label: 'New',
  Icon: SomeOutlinedIcon, // any @mui/icons-material component
  Renderer: NewRenderer,
  Editor: NewEditor,
  createDefault: (sectionName) => ({ type: SectionTypesEnum.NEW, sectionName, content: { images: [] } }),
  normalize: normalizeNewSection, // from step 6 — used by the editor AND by inline edits
};

export const SECTION_REGISTRY: { [K in SectionType]: SectionDefinition<K> } = {
  [SectionTypesEnum.HERO]: heroDefinition,
  [SectionTypesEnum.TEXT]: textDefinition,
  [SectionTypesEnum.NEW]:  newDefinition, // ← add here
};
```

No change to `PageSection.tsx` is needed — it dispatches through `SECTION_REGISTRY`. Add the section-type picker label to i18n (`page.manage.pages.sectionType.new`, en + fr) plus every label your editor/panels reference, so the "Add section" menu and the design forms render.

### 10. Lock the public rendering with a test — `apps/web/src/components/sections/new/NewSection.test.tsx`

The renderer is dual-use, so add a characterization test that renders it **without** an editing context and asserts the public output (i18n default vs translation, empty fields render nothing) — mirror `hero/HeroSection.test.tsx` / `text/TextSection.test.tsx`. It stays green whether or not the editing seam changes, proving the public site is unaffected.

### 11. Add a section to the config, and its translations

Add the section object to a page in the seed file (`apps/functions/src/handlers/seed/siteConfig.json`) for local dev, or POST the updated config to `/api/config` in production:

```json
{
  "sectionName": "new-section",
  "type": "new",
  "content": {
    "title": "Our New Section",
    "images": [{ "url": "/img1.jpg", "alt": "Image 1" }]
  },
  "design": { "columns": 2 }
}
```

The config values you just added *are* the default-language text (`config.site.defaultLanguage`) — nothing else to do for that language. Every key the collector emits then needs a value in each **override** language. Manage them from the **Translations** page under `/manage` — expected keys come straight from `collectI18nEntries`, so the new section's keys appear automatically, flagged as *missing* until filled. For local dev add them to the seed `apps/functions/src/handlers/seed/i18n.json` (override locales only — `fr` in the bundled seed; the default language must **not** have a dictionary there); `seed.test.ts` enforces that the seed config and translations stay in lockstep — no default-language dictionary, and no missing or extra keys per override — so it fails until every new key is present and non-empty.

```json
{
  "page.home.new-section.content.title": "Notre nouvelle section",
  "page.home.new-section.content.images.0.alt": "Image 1"
}
```

---

## Adding a Feature Page to the Menu

Feature pages are public pages shipped by optional features (as opposed to config-driven pages) — `team`, `contact` and `gallery` ship today; events… follow the same path. They own a fixed route, are gated by a runtime feature flag, and can be linked from the navigation via the **Menu** tab. To add one:

1. **Declare the id, its reserved route and its default label** — `libs/interfaces/src/menu.interface.ts`: add the id to `FeaturePagesEnum` (which feeds `FeaturePageIdSchema`), its route to `FEATURE_PAGE_ROUTES`, and its default nav label to `FEATURE_PAGE_DEFAULT_LABELS`. The route (and everything nested under it) immediately becomes reserved: config pages can no longer claim it. The label is only a default — admins rename it per site from the Menu tab (stored as the menu entry's `menuTitle`) and translate it per language from the Translations page (`collectI18nEntries` emits `${feature}.menuTitle`), so do NOT add it to the static `i18n.json` bundle (a bundled value would shadow the config-driven label).
2. **Add the feature flag** — `apps/functions/src/handlers/FeaturesModule.ts` (new `FEATURE_<X>` env var, reported by `GET /api/features`) and the `FeatureFlags` interface in `apps/web/src/services/featuresService.ts` (+ `ALL_DISABLED` in `hooks/useFeatureFlags.ts`). Document the variable in `.env.example`.
3. **Register the page in the web registry** — `apps/web/src/router/publicMenu.ts`: add a `FEATURE_PAGE_REGISTRY` entry `{ route, pageName, flag }`. The nav label i18n key is `` `${pageName}.menuTitle` `` (fed by the menu entry's `menuTitle`/default — see step 1; no bundle entry).
4. **Register the routes** — add the feature's `<Route>` elements in `apps/web/src/router/AppRouter.tsx` **before** the `*` catch-all. Register them unconditionally and let the page component gate itself on the flag (render `NotFoundPage` when off) — conditional registration flashes a 404 while flags load.
5. **Expose the feature's own translatable defaults** (only if the feature stores text in its own blob, like the team's `title`/`presentation` or the contact's `presentation`) — the Translations editor derives its expected keys from the site config, so it cannot see a feature blob. Add a `collect<Feature>I18nEntries(config)` collector next to the feature's schema in `libs/interfaces` (see `collectTeamI18nEntries` / `collectContactI18nEntries`) and merge it into the `setExpected` call in `apps/web/src/pages/admin/TranslationsPage.tsx` (load the blob with `.catch(() => null)` — a 404 just means the flag is off). Give each admin field a `TranslateShortcut` (`apps/web/src/components/manage/TranslateShortcut.tsx`) deep-linking to its key.

Nothing else is needed for the menu: `reconcileMenu` appends the new feature's entry (hidden) **at the top level** to stored menus once the flag is on, the Menu tab shows it with a *Feature* badge (greyed while the flag is off, without losing its position), and `resolveNavTree` renders it in the public nav when visible and enabled. Admins can then move the entry into a menu group like any other entry — it keeps its flag-gating inside the group. A feature can also expand its own **top-level** entry into a dynamically-populated group of nav items — the gallery resolves its themes this way (`galleryNavGroup` in `publicMenu.ts`); `NavGroup` is origin-agnostic, so `MenuBar` needs no change.

> **Reserved-route migration note:** step 1 reserves the route for *incoming* configs only (`SiteConfigSchema`). Stored configs are read with the lenient `StoredSiteConfigSchema`, so a site whose config already used that route keeps working after the upgrade — the admin renames the colliding page from the Pages editor at their own pace.

---

## Mobile-First Development

All new components must use MUI's `sx` prop with mobile-first responsive values — start from the smallest breakpoint and override upward:

```typescript
sx={{
  fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
  padding:  { xs: 2,      sm: 3,         md: 4 },
  display:  { xs: 'none', md: 'block' },   // hide on mobile
}}
```

Touch targets must be at least 44 × 44 px. Test on both portrait and landscape orientations before opening a PR.
