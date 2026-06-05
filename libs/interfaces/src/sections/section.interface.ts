import { z } from "zod";

// Shared zone style — inline CSS overrides applicable to any zone/element
export const ZoneStyleSchema = z.object({
  style:   z.record(z.string(), z.string()).optional(), // regular CSS properties (padding, borderRadius, …)
  cssVars: z.record(z.string(), z.string()).optional(), // CSS custom properties (--xxx: value)
});
export type ZoneStyle = z.infer<typeof ZoneStyleSchema>;

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