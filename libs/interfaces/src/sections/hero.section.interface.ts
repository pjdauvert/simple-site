import { z } from "zod";
import { BaseSectionPropsSchema, BaseSectionDesignSchema, SectionTypesEnum } from "./section.interface.js";

// Hero block
const HeroContentSchema = z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaLink: z.string().optional(),
  });
  
  const HeroDesignSchema = BaseSectionDesignSchema.extend({
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    parallax: z.boolean().optional(),
  });
  
  export const HeroSectionPropsSchema = BaseSectionPropsSchema.extend({
    type: z.literal(SectionTypesEnum.HERO),
    content: HeroContentSchema,
    design: HeroDesignSchema.optional(),
  });
  
  export type HeroSectionProps = z.infer<typeof HeroSectionPropsSchema>;
  
  
