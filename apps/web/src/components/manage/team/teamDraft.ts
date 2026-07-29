import {
  ALL_SOCIAL_NETWORKS,
  TEAM_SLUG_PATTERN,
  type SocialLinks,
  type TeamMember,
} from '@simple-site/interfaces';

/**
 * A member row in the editor. `persisted` marks members that exist in the
 * stored team (loaded, or successfully saved this session): their slug — the
 * public URL identity — is locked and can never change again. Editor-only,
 * stripped by the schema parse before saving.
 */
export interface MemberDraft extends TeamMember {
  persisted?: boolean;
}

/** A blank member, opened straight in the edit dialog (slug derives from the name). */
export const createMember = (): MemberDraft => ({ slug: '', name: '', jobTitle: {}, biography: {} });

/** Trims every locale's text and drops the empty ones (job title, biography). */
export const normalizeLocalizedText = (record: Record<string, string>): Record<string, string> => {
  const normalized: Record<string, string> = {};
  for (const [locale, text] of Object.entries(record)) {
    const value = text.trim();
    if (value) normalized[locale] = value;
  }
  return normalized;
};

/** Trims every link and drops empty ones; returns undefined when nothing remains. */
export const normalizeSocialLinks = (links: SocialLinks | undefined): SocialLinks | undefined => {
  if (!links) return undefined;
  const normalized: SocialLinks = {};
  for (const network of ALL_SOCIAL_NETWORKS) {
    const value = links[network]?.trim();
    if (value) normalized[network] = value;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

/** Field-level problems on a single member, used to flag inputs after a failed save. */
export interface MemberFieldErrors {
  name?: 'empty';
  slug?: 'empty' | 'duplicate' | 'pattern';
}

/** Validate structural member fields across the whole team (slugs must be unique). */
export const validateMembers = (members: TeamMember[]): MemberFieldErrors[] => {
  const slugCounts = new Map<string, number>();
  for (const member of members) {
    const slug = member.slug.trim();
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }
  return members.map((member) => {
    const errors: MemberFieldErrors = {};
    const slug = member.slug.trim();
    if (!member.name.trim()) errors.name = 'empty';
    if (!slug) errors.slug = 'empty';
    else if (!TEAM_SLUG_PATTERN.test(slug)) errors.slug = 'pattern';
    else if ((slugCounts.get(slug) ?? 0) > 1) errors.slug = 'duplicate';
    return errors;
  });
};

/** True when no member has any field error. */
export const membersAreValid = (errors: MemberFieldErrors[]): boolean =>
  errors.every((e) => !e.name && !e.slug);
