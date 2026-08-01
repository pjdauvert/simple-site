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

/** Per-locale member text (job title, biography), keyed by ISO 639-1 code. */
const LocalizedTextSchema = z.record(I18nLocaleSchema, z.string());

export const TeamMemberSchema = z.object({
  slug: z.string().regex(TEAM_SLUG_PATTERN),
  name: z.string().min(1),
  /**
   * Per-locale job title. Like the biography it lives inside the member,
   * independent of the platform translations blob. Legacy blobs stored a plain
   * string — coerced into the base-locale entry on parse.
   */
  jobTitle: z.preprocess(
    (value) => (typeof value === "string" ? (value.trim() ? { [BASE_LOCALE]: value } : {}) : value),
    LocalizedTextSchema.default({}),
  ),
  photoUrl: UrlOrPathSchema.optional(),
  /**
   * Per-locale biography (markdown), keyed by ISO 639-1 code. Stored inside the
   * member — independent of the platform translations blob. Rendering falls back
   * to the base locale, then to the first non-empty entry.
   */
  biography: LocalizedTextSchema.default({}),
  /** Optional social links; the profile renders an icon per non-empty entry. */
  socialLinks: SocialLinksSchema.optional(),
  /**
   * Former members leave the main list; they render in the team page's
   * "former members" section — only while {@link TeamConfigSchema.showFormerMembers}
   * is on. Absent → current member.
   */
  former: z.boolean().optional(),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

/** Translation key of the team-page heading. */
export const TEAM_TITLE_KEY = "team.title";
/** Translation key of the team presentation text. */
export const TEAM_PRESENTATION_KEY = "team.presentation";
/** Translation key of the former-members section heading. */
export const TEAM_FORMER_MEMBERS_TITLE_KEY = "team.formerMembersTitle";

/**
 * Translatable (key → default value) pairs the team blob references, merged into
 * the Translations editor's expected keys alongside `collectI18nEntries` (the
 * team lives in its own blob, so the config walk cannot see it).
 */
export const collectTeamI18nEntries = (team: TeamConfig): I18nEntry[] => {
  const entries: I18nEntry[] = [];
  if (team.title?.trim()) entries.push({ key: TEAM_TITLE_KEY, defaultValue: team.title });
  if (team.presentation?.trim()) entries.push({ key: TEAM_PRESENTATION_KEY, defaultValue: team.presentation });
  if (team.formerMembersTitle?.trim()) {
    entries.push({ key: TEAM_FORMER_MEMBERS_TITLE_KEY, defaultValue: team.formerMembersTitle });
  }
  return entries;
};

/**
 * Design options of one team surface (the team page rows, or the member profile
 * page). Every field is optional — absent values fall back to that surface's
 * defaults (resolved web-side, see `pages/team/teamDisplay.ts`), so stored teams
 * keep their current look.
 */
export const TeamSectionDesignSchema = z.object({
  /** Portrait corner radius in percent: 50 = circle (default), 0 = square. */
  pictureRadius: z.number().min(0).max(50).optional(),
  /** Draws a border around the portrait. */
  pictureBorder: z.boolean().optional(),
  /** Portrait border color (CSS); absent → the theme's primary color. */
  pictureBorderColor: z.string().optional(),
  /** Background color (CSS) of the description frame. */
  frameBackgroundColor: z.string().optional(),
  /** Draws a border around the description frame. */
  frameBorder: z.boolean().optional(),
  /** Frame border color (CSS); absent → the theme's divider color. */
  frameBorderColor: z.string().optional(),
});

export type TeamSectionDesign = z.infer<typeof TeamSectionDesignSchema>;

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
    /** When true, the team page shows the "former members" section. Absent → hidden. */
    showFormerMembers: z.boolean().optional(),
    /**
     * Optional heading of the "former members" section (above its separator line).
     * A translation DEFAULT like the page title, under {@link TEAM_FORMER_MEMBERS_TITLE_KEY}.
     * Absent/empty → the section renders its separator without a heading.
     */
    formerMembersTitle: z.string().optional(),
    /** Per-surface design options, edited from the team Design tab. */
    design: z
      .object({
        teamPage: TeamSectionDesignSchema.optional(),
        memberPage: TeamSectionDesignSchema.optional(),
      })
      .optional(),
  })
  .refine((team) => new Set(team.members.map((m) => m.slug)).size === team.members.length, {
    message: "Member slugs must be unique",
    path: ["members"],
  });

export type TeamConfig = z.infer<typeof TeamConfigSchema>;

