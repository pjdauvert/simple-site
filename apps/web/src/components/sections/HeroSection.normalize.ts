import type { HeroArtwork, HeroCtaButton, HeroSectionProps } from '@simple-site/interfaces';

type HeroContent = HeroSectionProps['content'];
type HeroDesign = NonNullable<HeroSectionProps['design']>;

/** True when a string is present and not just whitespace. */
const nonEmpty = (s?: string): s is string => !!s && s.trim().length > 0;

const cleanCta = (c: HeroCtaButton): HeroCtaButton => ({
  label: c.label,
  link: c.link,
  ...(c.variant ? { variant: c.variant } : {}),
});

const cleanArtwork = (a?: Partial<HeroArtwork>): HeroArtwork | undefined => {
  if (!a || !nonEmpty(a.imageUrl)) return undefined;
  const out: HeroArtwork = { imageUrl: a.imageUrl };
  if (nonEmpty(a.alt)) out.alt = a.alt;
  if (a.verticalAlign) out.verticalAlign = a.verticalAlign;
  if (a.horizontalAlign) out.horizontalAlign = a.horizontalAlign;
  if (a.imageStyle) out.imageStyle = a.imageStyle; // advanced: pass-through
  return out;
};

const cleanContent = (c: HeroContent): HeroContent => {
  const out: HeroContent = {};
  if (nonEmpty(c.title)) out.title = c.title;
  if (nonEmpty(c.subtitle)) out.subtitle = c.subtitle;
  if (c.ctaButtons?.length) out.ctaButtons = c.ctaButtons.map(cleanCta);
  if (c.featuringItems?.length) {
    out.featuringItems = c.featuringItems.map((f) => ({ label: f.label, value: f.value }));
  }
  return out;
};

const cleanDesign = (d?: Partial<HeroDesign>): HeroDesign | undefined => {
  if (!d) return undefined;
  const out: HeroDesign = {};
  if (nonEmpty(d.backgroundColor)) out.backgroundColor = d.backgroundColor;
  if (nonEmpty(d.textColor)) out.textColor = d.textColor;
  if (d.layout) out.layout = d.layout;
  if (d.columnLayout) out.columnLayout = d.columnLayout;
  if (d.artworkSide) out.artworkSide = d.artworkSide;
  const artwork = cleanArtwork(d.artwork);
  if (artwork) out.artwork = artwork;
  if (d.sectionStyle) out.sectionStyle = d.sectionStyle; // advanced: pass-through
  if (d.contentStyle) out.contentStyle = d.contentStyle; // advanced: pass-through
  if (d.artworkStyle) out.artworkStyle = d.artworkStyle; // advanced: pass-through
  return Object.keys(out).length ? out : undefined;
};

/**
 * Canonicalize a hero section: empty optional fields are dropped, empty arrays and
 * an empty `design` are omitted entirely, so the section always serializes clean.
 * Shared by the section's form editor and by inline (in-place) edits.
 */
export const normalizeHeroSection = (section: HeroSectionProps): HeroSectionProps => {
  const next: HeroSectionProps = {
    type: section.type,
    sectionName: section.sectionName,
    content: cleanContent(section.content),
  };
  const design = cleanDesign(section.design);
  return design ? { ...next, design } : next;
};
