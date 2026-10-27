/**
 * Default slug for a display name: diacritics stripped, lowercased,
 * kebab-cased. Shared by every feature whose items carry an immutable
 * public slug (team members, events).
 */
export const slugify = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
