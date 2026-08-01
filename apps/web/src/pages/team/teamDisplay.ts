import {
  ALL_SOCIAL_NETWORKS,
  BASE_LOCALE,
  type SocialNetworkId,
  type TeamMember,
  type TeamSectionDesign,
} from '@simple-site/interfaces';

/**
 * Web-side display helpers over the shared team contract: how the site picks
 * localized member texts, lists social links, and resolves per-surface design
 * options. Rendering-only logic — `libs/interfaces` keeps strictly what both
 * the web app and the functions consume.
 */

/**
 * The member text (biography, job title) to render for a locale: exact locale →
 * base locale → first non-empty entry → empty string.
 */
export const pickLocalizedText = (record: Record<string, string>, locale: string): string => {
  if (record[locale]?.trim()) return record[locale];
  if (record[BASE_LOCALE]?.trim()) return record[BASE_LOCALE];
  return Object.values(record).find((text) => text?.trim()) ?? '';
};

/**
 * Languages the member's own texts exist in (non-empty biography or job title),
 * sorted for a stable order. Drives the profile page's language switch, which
 * only appears when the member has 2+ of them.
 */
export const memberLocales = (member: TeamMember): string[] => {
  const locales = new Set<string>();
  for (const record of [member.jobTitle, member.biography]) {
    for (const [locale, text] of Object.entries(record)) {
      if (text?.trim()) locales.add(locale);
    }
  }
  return [...locales].sort();
};

/** The member's non-empty social links, in display order. */
export const memberSocialEntries = (member: TeamMember): Array<[SocialNetworkId, string]> =>
  ALL_SOCIAL_NETWORKS.flatMap((network) => {
    const href = member.socialLinks?.[network]?.trim();
    return href ? [[network, href] as [SocialNetworkId, string]] : [];
  });

/** Team page rows are flat by default: circular portrait, no frame. */
export const TEAM_PAGE_DESIGN_DEFAULTS = { pictureRadius: 50, pictureBorder: false, frameBorder: false } as const;
/** The member profile keeps its bordered bio card by default. */
export const MEMBER_PAGE_DESIGN_DEFAULTS = { pictureRadius: 50, pictureBorder: false, frameBorder: true } as const;

export type SectionDesignDefaults = typeof TEAM_PAGE_DESIGN_DEFAULTS | typeof MEMBER_PAGE_DESIGN_DEFAULTS;

export interface ResolvedSectionDesign {
  pictureRadius: number;
  pictureBorder: boolean;
  pictureBorderColor?: string;
  frameBackgroundColor?: string;
  frameBorder: boolean;
  frameBorderColor?: string;
}

/** Applies a surface's defaults to its (possibly absent) stored design. */
export const resolveSectionDesign = (
  design: TeamSectionDesign | undefined,
  defaults: SectionDesignDefaults,
): ResolvedSectionDesign => ({
  pictureRadius: design?.pictureRadius ?? defaults.pictureRadius,
  pictureBorder: design?.pictureBorder ?? defaults.pictureBorder,
  pictureBorderColor: design?.pictureBorderColor,
  frameBackgroundColor: design?.frameBackgroundColor,
  frameBorder: design?.frameBorder ?? defaults.frameBorder,
  frameBorderColor: design?.frameBorderColor,
});
