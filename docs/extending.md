# Extending the Application

## Adding a New Section Type

Sections are typed via a Zod discriminated union on the `type` field, shared between the frontend and the functions. Each section type lives in its **own interface file** and owns both its schema and the knowledge of which of its content fields are translatable — so nothing about a section leaks into a central switch.

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

`add(path, value)` records a `(scoped key → value)` entry and skips empty/absent values — mirroring the renderer's `field && <FormattedMessage>` guard. The key it builds (`sectionContentKey(scope, path)` → `${scope}.content.${path}`) **must match** the id the renderer looks up (step 5).

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

This dispatch is the **only** central i18n touch-point — the field details stay in the section file. It keeps the public renderers and the admin Translations editor deriving the *same* keys, so the editor never shows false “missing / extra” warnings for the new section.

### 5. Create the React component — `apps/web/src/components/sections/NewSection.tsx`

The renderer is the **single source of layout**, used both by the public site and by the admin editor's live preview. Instead of a plain `<FormattedMessage>`, declare each editable field as a **slot**: `EditableText` for text, `EditableMarkdown` for a Markdown body, `EditableImage` for images. Each takes the same dotted `path` the i18n collector uses (step 3), so one declaration serves both rendering and in-place editing:

- **Public site** (no editing context): a slot renders exactly the `FormattedMessage` / `<img>` it would have before — the config value is the i18n *default*, a translation for the scoped key wins, and an empty field renders nothing.
- **Admin, section selected**: the same slot becomes an in-place field (inheriting the surrounding typography) that writes back to the config at `path`.

Wrap optional fields in `useSlotVisible()` so they still render (as a ghost placeholder) while editing even when empty — otherwise there'd be nothing to click.

```typescript
import React from 'react';
import { Container, Box, Typography } from '@mui/material';
import type { NewSectionProps } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useAppTheme';
import { EditableText } from './EditableText';
import { useSlotVisible } from './sectionEdit';

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
        {/* one Editable* slot per key the collector emits */}
      </Container>
    </Box>
  );
};
```

### 6. Add a normalizer — `apps/web/src/components/sections/NewSection.normalize.ts`

Both the form editor and inline edits emit through one canonicaliser that drops empty optional fields (and omits empty arrays/objects) so the section always serializes clean — mirror `HeroSection.normalize.ts` / `TextSection.normalize.ts`:

```typescript
import type { NewSectionProps } from '@simple-site/interfaces';

export const normalizeNewSection = (section: NewSectionProps): NewSectionProps => {
  /* build a fresh object keeping only non-empty fields */
  return section;
};
```

### 7. Create the colocated editor — `apps/web/src/components/sections/NewSection.editor.tsx`

Content (text, images) is edited **in place on the rendered section**, so the editor is **structure + design only** — it lives in a full-width bottom sheet under the preview and handles what has no place on the canvas: layout, colours, breakpoints, and add/remove of repeatable items. It's a controlled component typed by `SectionEditorProps<'new'>` (from `registry.ts`) that emits through your normalizer; mirror `HeroSection.editor.tsx` / `TextSection.editor.tsx`. Do **not** duplicate the text/image fields here. Labels use `react-intl` (id-only) under `page.manage.pages.section.new.*`; use `ColorField` (from `../manage/themes/ColorField`) for colours.

```typescript
import React from 'react';
import { Stack, MenuItem, TextField } from '@mui/material';
import { useIntl } from 'react-intl';
import type { SectionEditorProps } from './registry';
import { normalizeNewSection } from './NewSection.normalize';

export const NewSectionEditor: React.FC<SectionEditorProps<'new'>> = ({ value, onChange }) => {
  const intl = useIntl();
  const setDesign = (patch: object) =>
    onChange(normalizeNewSection({ ...value, design: { ...value.design, ...patch } }));
  return (
    <Stack spacing={2}>
      <TextField
        select
        label={intl.formatMessage({ id: 'page.manage.pages.section.new.layout' })}
        value={value.design?.layout ?? ''}
        onChange={(e) => setDesign({ layout: e.target.value || undefined })}
        size="small"
      >
        <MenuItem value="a">A</MenuItem>
        <MenuItem value="b">B</MenuItem>
      </TextField>
    </Stack>
  );
};
```

### 7. Register in the section registry — `apps/web/src/components/sections/registry.ts`

The registry is the single dispatch point: the public renderer (`apps/web/src/pages/dynamic/PageSection.tsx`), the admin **Pages editor** (`/manage/site/pages`), and the add-section picker all read from it. Add one entry — a lazy renderer, a lazy editor, an icon, a label key, and a `createDefault` factory for a blank, schema-valid section:

```typescript
const NewRenderer = lazy(() => import('./NewSection').then((m) => ({ default: m.NewSection })));
const NewEditor   = lazy(() => import('./NewSection.editor').then((m) => ({ default: m.NewSectionEditor })));

const newDefinition: SectionDefinition<'new'> = {
  type: SectionTypesEnum.NEW,
  labelKey: 'page.manage.pages.sectionType.new',
  label: 'New',
  Icon: SomeOutlinedIcon, // any @mui/icons-material component
  Renderer: NewRenderer,
  Editor: NewEditor,
  createDefault: (sectionName) => ({ type: SectionTypesEnum.NEW, sectionName, content: { images: [] } }),
  normalize: normalizeNewSection, // from step 6 — used by the form AND by inline edits
};

export const SECTION_REGISTRY: { [K in SectionType]: SectionDefinition<K> } = {
  [SectionTypesEnum.HERO]: heroDefinition,
  [SectionTypesEnum.TEXT]: textDefinition,
  [SectionTypesEnum.NEW]:  newDefinition, // ← add here
};
```

No change to `PageSection.tsx` is needed — it dispatches through `SECTION_REGISTRY`. Add the section-type picker label to i18n too (`page.manage.pages.sectionType.new`, en + fr) so the "Add section" menu shows it.

### 8. Add a section to the config

Add the section object to a page in the seed file (`apps/functions/src/handlers/seed/siteConfig.json`) for local dev, or POST the updated config to `/api/config` in production:

```json
{
  "sectionName": "new-section",
  "type": "new",
  "content": {
    "title": "Our New Section",
    "images": [
      { "url": "/img1.jpg", "alt": "Image 1" }
    ]
  },
  "design": { "columns": 2 }
}
```

### 9. Add translations

Every key the collector emits for this section needs a value in each language. Manage them from the **Translations** page under `/manage` — because expected keys come straight from `collectI18nEntries`, the new section's keys appear automatically, flagged as *missing* until filled. For local dev, add them to the seed `apps/functions/src/handlers/seed/i18n.json` (both `en` and `fr`); the `seed.test.ts` parity check enforces that the seed config and translations stay in lockstep — no missing or extra keys — so it will fail until every new key is present and non-empty.

```json
{
  "page.home.new-section.content.title": "Our New Section",
  "page.home.new-section.content.images.0.alt": "Image 1"
}
```

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
