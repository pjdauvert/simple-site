# Extending the Application

## Adding a New Section Type

Sections are typed via a Zod discriminated union on the `type` field, shared between the frontend and the functions. Adding a new type requires touching four files.

### 1. Define the schema — `libs/interfaces/src/sections/section.interface.ts`

```typescript
export const SectionTypesEnum = {
  HERO: 'hero',
  TEXT: 'text',
  NEW:  'new', // ← add here
} as const;
```

Then define its content / design schemas and a props schema that extends `BaseSectionPropsSchema`:

```typescript
const NewContentSchema = z.object({
  title:  z.string().optional(),
  images: z.array(z.object({ url: z.string(), alt: z.string() })),
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
```

### 2. Add to the discriminated union — `libs/interfaces/src/page.interface.ts`

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

### 3. Create the React component — `apps/web/src/components/sections/NewSection.tsx`

```typescript
import React from 'react';
import { Container, Box } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { NewSectionProps } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useTheme';

export const NewSection: React.FC<NewSectionProps> = ({ sectionName, content, design }) => {
  const { siteThemeConfig } = useAppTheme();
  return (
    <Box>
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
        <FormattedMessage
          id={`${sectionName}.content.title`}
          defaultMessage={content.title}
        />
        {/* render the rest of content here */}
      </Container>
    </Box>
  );
};
```

### 4. Register the component — `apps/web/src/components/index.ts`

```typescript
export { NewSection } from './sections/NewSection';
```

### 5. Add the render case — `apps/web/src/pages/dynamic/PageSection.tsx`

```typescript
import { NewSection } from '../../components';

case SectionTypesEnum.NEW:
  return <NewSection {...props} />;
```

### 6. Add a section to the config

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

### 7. Add translations (optional)

Edit `apps/functions/src/handlers/seed/i18n.json` locally, or push via the API in production:

```bash
curl -X POST https://<your-site>/api/translations/en \
  -H "Content-Type: application/json" \
  -d '{ "page.home.new-section.content.title": "Our New Section" }'
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
