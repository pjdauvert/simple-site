import { z } from "zod";
import { BASE_LOCALE, I18nLocaleSchema } from "./i18n.interface.js";
import { UrlOrPathSchema } from "./url.interface.js";

/**
 * Team feature — members are stored in their own blob (key `team`), managed from
 * /manage/team and rendered publicly at /team and /team/member/<slug>. Unlike the
 * site config there is no draft/publish lifecycle: admin saves go live immediately.
 */

/** URL-safe member identifier: lowercase kebab-case (e.g. `jane-doe`). */
export const TEAM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

// Array order = display order on the public team overview page.
export const TeamConfigSchema = z
  .object({
    members: z.array(TeamMemberSchema),
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
