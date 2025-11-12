import { z } from "zod";

const SectionImagePosition = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

const SectionImageSize = {
  COVER: 'cover',
  CONTAIN: 'contain',
} as const;

// Section design schema
export const SectionDesignSchema = z.object({
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
});

/****************************************
* Section blocks customizations schemas *
*****************************************/

const BaseSectionPropsSchema = z.object({
  sectionName: z.string(),
});

// Exhaustive list of all section types
export const SectionTypesEnum = {
    HERO: 'hero',
    TEXT: 'text',
} as const;


// Hero block
const HeroContentSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaLink: z.string().optional(),
});

const HeroDesignSchema = SectionDesignSchema.extend({
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  parallax: z.boolean().optional(),
});

const HeroSectionPropsSchema = BaseSectionPropsSchema.extend({
  type: z.literal(SectionTypesEnum.HERO),
  content: HeroContentSchema,
  design: HeroDesignSchema.optional(),
});

export type HeroSectionProps = z.infer<typeof HeroSectionPropsSchema>;

// Text block
const TextContentSchema = z.object({
  title: z.string().optional(),
  paragraph: z.string().optional(),
});

const TextDesignSchema = SectionDesignSchema.extend({
  imageUrl: z.string().optional(),
  imagePosition: z.union([z.literal(SectionImagePosition.LEFT), z.literal(SectionImagePosition.RIGHT), z.string()]).optional(),
  imageSize: z.union([z.literal(SectionImageSize.COVER), z.literal(SectionImageSize.CONTAIN), z.string()]).optional(),
  videoUrl: z.string().optional(),
  parallax: z.boolean().optional(),
});

const TextSectionPropsSchema = BaseSectionPropsSchema.extend({
  type: z.literal(SectionTypesEnum.TEXT),
  content: TextContentSchema,
  design: TextDesignSchema.optional(),
});

export type TextSectionProps = z.infer<typeof TextSectionPropsSchema>;

/****************************************
* PageSection props schema              *
*****************************************/

// Section types
export const SectionTypeSchema = z.enum(Object.values(SectionTypesEnum));

export type SectionType = z.infer<typeof SectionTypeSchema>;

// Union of all section types (discriminated union)
export const SectionPropsSchema = z.discriminatedUnion('type', [
  HeroSectionPropsSchema,
  TextSectionPropsSchema,
]);

// Conditional type to get the correct props based on section type
export type SectionProps<T extends SectionType> = 
  T extends typeof SectionTypesEnum.HERO 
    ? HeroSectionProps
    : T extends typeof SectionTypesEnum.TEXT
    ? TextSectionProps
    : never;