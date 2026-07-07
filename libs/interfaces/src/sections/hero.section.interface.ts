import { z } from "zod";
import { BaseSectionPropsSchema, BaseSectionDesignSchema, SectionTypesEnum, ZoneStyleSchema, createSectionI18n, type SectionI18nCollector } from "./section.interface.js";
import { UrlOrPathSchema } from "../url.interface.js";
import { VerticalAlignSchema, HorizontalAlignSchema } from "../layout.interface.js";

// CTA button
const HeroCtaButtonSchema = z.object({
  label:   z.string(),
  link:    z.string(),
  variant: z.enum(['contained', 'outlined', 'text']).optional(),
});
export type HeroCtaButton = z.infer<typeof HeroCtaButtonSchema>;

// Featuring item (label/value stat row)
const HeroFeaturingItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type HeroFeaturingItem = z.infer<typeof HeroFeaturingItemSchema>;

// Artwork panel
const HeroArtworkSchema = z.object({
  imageUrl:        UrlOrPathSchema,
  alt:             z.string().optional(),
  verticalAlign:   VerticalAlignSchema.optional(),
  horizontalAlign: HorizontalAlignSchema.optional(),
  imageStyle:      ZoneStyleSchema.optional(),
});
export type HeroArtwork = z.infer<typeof HeroArtworkSchema>;

// Hero content
const HeroContentSchema = z.object({
  title:          z.string().optional(),
  subtitle:       z.string().optional(),
  ctaButtons:     z.array(HeroCtaButtonSchema).optional(),
  featuringItems: z.array(HeroFeaturingItemSchema).optional(),
});

// Hero design
const HeroDesignSchema = BaseSectionDesignSchema.extend({
  layout:       z.enum(['centered', 'split']).optional(),
  columnLayout: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  artworkSide:  z.enum(['left', 'right']).optional(),
  artwork:      HeroArtworkSchema.optional(),
  sectionStyle: ZoneStyleSchema.optional(),
  contentStyle: ZoneStyleSchema.optional(),
  artworkStyle: ZoneStyleSchema.optional(),
});

export const HeroSectionPropsSchema = BaseSectionPropsSchema.extend({
  type:    z.literal(SectionTypesEnum.HERO),
  content: HeroContentSchema,
  design:  HeroDesignSchema.optional(),
});

export type HeroSectionProps = z.infer<typeof HeroSectionPropsSchema>;

/** Translatable strings of a hero section: title, subtitle, CTA labels, featuring items. */
export const collectHeroI18n: SectionI18nCollector<HeroSectionProps> = ({ content }, scope) => {
  const { entries, add } = createSectionI18n(scope);
  add('title', content.title);
  add('subtitle', content.subtitle);
  content.ctaButtons?.forEach((cta, i) => add(`ctaButtons.${i}.label`, cta.label));
  content.featuringItems?.forEach((item, i) => {
    add(`featuringItems.${i}.label`, item.label);
    add(`featuringItems.${i}.value`, item.value);
  });
  return entries;
};
