import { z } from "zod";
import { BASE_LOCALE, I18nLocaleSchema } from "./i18n.interface.js";
import { UrlOrPathSchema } from "./url.interface.js";
import type { I18nEntry } from "./sections/section.interface.js";

/**
 * Team feature — members are stored in their own blob (key `team`), managed from
 * /manage/team and rendered publicly at /team and /team/member/<slug>. Unlike the
 * site config there is no draft/publish lifecycle: admin saves go live immediately.
 */

/** URL-safe member identifier: lowercase kebab-case (e.g. `jane-doe`). */
export const TEAM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Social networks a member profile can link to. Extending the set means adding
 * it here, in `SocialLinksSchema`, and mapping its icon in the web app's
 * `pages/team/socialIcons.tsx`.
 */
export const SocialNetworksEnum = {
  LINKEDIN: "linkedin",
  X: "x",
  GITHUB: "github",
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  YOUTUBE: "youtube",
  WEBSITE: "website",
} as const;

export type SocialNetworkId = (typeof SocialNetworksEnum)[keyof typeof SocialNetworksEnum];

/** Display order of the social icons row. */
export const ALL_SOCIAL_NETWORKS: readonly SocialNetworkId[] = Object.values(SocialNetworksEnum);

export const SocialLinksSchema = z.object({
  linkedin: UrlOrPathSchema.optional(),
  x: UrlOrPathSchema.optional(),
  github: UrlOrPathSchema.optional(),
  instagram: UrlOrPathSchema.optional(),
  facebook: UrlOrPathSchema.optional(),
  youtube: UrlOrPathSchema.optional(),
  website: UrlOrPathSchema.optional(),
});

export type SocialLinks = z.infer<typeof SocialLinksSchema>;

export const TeamMemberSchema = z.object({
  slug: z.string().regex(TEAM_SLUG_PATTERN),
  name: z.string().min(1),
  jobTitle: z.string(),
  photoUrl: UrlOrPathSchema.optional(),
  /**
   * Per-locale biography (markdown), keyed by ISO 639-1 code. Stored inside the
   * member — independent of the platform translations blob. Rendering falls back
   * to the base locale, then to the first non-empty entry.
   */
  biography: z.record(I18nLocaleSchema, z.string()).default({}),
  /** Optional social links; the profile renders an icon per non-empty entry. */
  socialLinks: SocialLinksSchema.optional(),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

/** Translation key of the team-page heading. */
export const TEAM_TITLE_KEY = "team.title";
/** Translation key of the team presentation text. */
export const TEAM_PRESENTATION_KEY = "team.presentation";

/**
 * Translatable (key → default value) pairs the team blob references, merged into
 * the Translations editor's expected keys alongside `collectI18nEntries` (the
 * team lives in its own blob, so the config walk cannot see it).
 */
export const collectTeamI18nEntries = (team: TeamConfig): I18nEntry[] => {
  const entries: I18nEntry[] = [];
  if (team.title?.trim()) entries.push({ key: TEAM_TITLE_KEY, defaultValue: team.title });
  if (team.presentation?.trim()) entries.push({ key: TEAM_PRESENTATION_KEY, defaultValue: team.presentation });
  return entries;
};

/** The member's non-empty social links, in display order. */
export const memberSocialEntries = (member: TeamMember): Array<[SocialNetworkId, string]> =>
  ALL_SOCIAL_NETWORKS.flatMap((network) => {
    const href = member.socialLinks?.[network]?.trim();
    return href ? [[network, href] as [SocialNetworkId, string]] : [];
  });

// Array order = display order on the public team overview page.
export const TeamConfigSchema = z
  .object({
    members: z.array(TeamMemberSchema),
    /**
     * Optional team-page heading. A translation DEFAULT like the presentation:
     * per-language values are managed on the Translations page under
     * {@link TEAM_TITLE_KEY}. Absent/empty → the page renders no heading.
     */
    title: z.string().optional(),
    /**
     * Optional team presentation (markdown), shown above the member list on the
     * team page. Unlike biographies it is a translation DEFAULT: per-language
     * values are managed on the Translations page under {@link TEAM_PRESENTATION_KEY}.
     */
    presentation: z.string().optional(),
    /**
     * Team-page layout option: when true, member rows alternate sides — first
     * member identification left / biography right, second reversed, and so on.
     * Mobile always stacks identification above biography. Absent → no alternation.
     */
    alternateLayout: z.boolean().optional(),
  })
  .refine((team) => new Set(team.members.map((m) => m.slug)).size === team.members.length, {
    message: "Member slugs must be unique",
    path: ["members"],
  });

export type TeamConfig = z.infer<typeof TeamConfigSchema>;

/**
 * The biography to render for a locale: exact locale → base locale → first
 * non-empty entry → empty string.
 */
export const pickBiography = (biography: TeamMember["biography"], locale: string): string => {
  if (biography[locale]?.trim()) return biography[locale];
  if (biography[BASE_LOCALE]?.trim()) return biography[BASE_LOCALE];
  return Object.values(biography).find((bio) => bio?.trim()) ?? "";
};

/** Default slug for a name: diacritics stripped, lowercased, kebab-cased. */
export const slugify = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
