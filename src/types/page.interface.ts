import { MenuItemSchema } from "./menu.interface";
import { z } from "zod";
import { type HeroSectionProps, type TextSectionProps, HeroSectionPropsSchema, TextSectionPropsSchema, SectionTypeSchema, SectionTypesEnum } from "./sections";


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



// PageConfiguration schema
export const PageConfigurationSchema = MenuItemSchema.extend({
    sections: z.array(SectionPropsSchema),
  })

export type PageConfiguration = z.infer<typeof PageConfigurationSchema>;