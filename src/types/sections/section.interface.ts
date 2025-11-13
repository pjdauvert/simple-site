import { z } from "zod";

// Section design schema
export const BaseSectionDesignSchema = z.object({
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
});

export const BaseSectionPropsSchema = z.object({
  sectionName: z.string(),
});

// Section types
export const SectionTypesEnum = {
  HERO: 'hero',
  TEXT: 'text',
} as const;

export const SectionTypeSchema = z.enum(Object.values(SectionTypesEnum));
export type SectionType = z.infer<typeof SectionTypeSchema>;