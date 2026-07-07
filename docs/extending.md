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

Build the `<FormattedMessage>` id with the shared `sectionContentKey` builder so it matches the collector's keys exactly. `sectionName` is already page-scoped by the `Page` renderer.

```typescript
import React from 'react';
import { Container, Box } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { NewSectionProps } from '@simple-site/interfaces';
import { sectionContentKey } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useAppTheme';

export const NewSection: React.FC<NewSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig } = useAppTheme();
  return (
    <Box>
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        <FormattedMessage
          id={sectionContentKey(sectionName, 'title')}
          defaultMessage={content.title}
        />
        {/* render the rest of content here — one FormattedMessage per key the collector emits */}
      </Container>
    </Box>
  );
};
```

### 6. Register + render the component

Export it from `apps/web/src/components/index.ts`:

```typescript
export { NewSection } from './sections/NewSection';
```

…and add the render case in `apps/web/src/pages/dynamic/PageSection.tsx`:

```typescript
import { NewSection } from '../../components';

case SectionTypesEnum.NEW:
  return <NewSection {...props} />;
```

### 7. Add a section to the config

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

### 8. Add translations

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
