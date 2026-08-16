import { EVENT_SLUG_PATTERN, UrlOrPathSchema, type SiteEvent } from '@simple-site/interfaces';

/**
 * Pure editor-state helpers of the events list tab. Instants are STORED as
 * UTC ISO strings but EDITED through `<input type="datetime-local">` in the
 * admin's own timezone — the two converters below are the only place that
 * translation happens.
 */

/**
 * An event row in the editor. `persisted` marks events that exist in the
 * stored draft (loaded, or successfully saved this session): their slug — the
 * public URL and i18n-key identity — is locked and can never change again.
 * Editor-only, stripped before saving.
 */
export interface EventDraft extends SiteEvent {
  persisted?: boolean;
}

/** A blank event, opened straight in the edit dialog (slug derives from the name). */
export const createEvent = (): EventDraft => ({
  slug: '',
  name: '',
  startDateTime: '',
  location: '',
});

/** The stored UTC instant as a local `datetime-local` input value ('' ↔ absent). */
export const utcToLocalInput = (iso: string | undefined): string => {
  if (!iso) return '';
  const instant = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}T${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
};

/** A local `datetime-local` input value as the stored UTC instant ('' ↔ absent). */
export const localInputToUtc = (value: string): string => {
  if (!value.trim()) return '';
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? '' : instant.toISOString();
};

/** Field-level problems on a single event, used to flag inputs after a failed save. */
export interface EventFieldErrors {
  name?: 'empty';
  slug?: 'empty' | 'duplicate' | 'pattern';
  start?: 'required';
  end?: 'beforeStart';
  location?: 'empty';
  website?: 'invalid';
}

/** Validate structural event fields across the whole list (slugs must be unique). */
export const validateEvents = (events: readonly EventDraft[]): EventFieldErrors[] => {
  const slugCounts = new Map<string, number>();
  for (const event of events) {
    const slug = event.slug.trim();
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }
  return events.map((event) => {
    const errors: EventFieldErrors = {};
    const slug = event.slug.trim();
    if (!event.name.trim()) errors.name = 'empty';
    if (!slug) errors.slug = 'empty';
    else if (!EVENT_SLUG_PATTERN.test(slug)) errors.slug = 'pattern';
    else if ((slugCounts.get(slug) ?? 0) > 1) errors.slug = 'duplicate';
    if (!event.startDateTime) errors.start = 'required';
    else if (event.endDateTime && new Date(event.endDateTime).getTime() < new Date(event.startDateTime).getTime()) {
      errors.end = 'beforeStart';
    }
    if (!event.location.trim()) errors.location = 'empty';
    const website = event.websiteUrl?.trim();
    if (website && !UrlOrPathSchema.safeParse(website).success) errors.website = 'invalid';
    return errors;
  });
};

/** True when no event has any field error. */
export const eventsAreValid = (errors: readonly EventFieldErrors[]): boolean =>
  errors.every((e) => Object.keys(e).length === 0);

/** The storable shape of a draft row: trimmed, empty optionals dropped, editor state stripped. */
export const normalizeEvent = (draft: EventDraft): SiteEvent => {
  const description = draft.description?.trim();
  const imageUrl = draft.imageUrl?.trim();
  const websiteUrl = draft.websiteUrl?.trim();
  return {
    slug: draft.slug.trim(),
    name: draft.name.trim(),
    startDateTime: draft.startDateTime,
    ...(draft.endDateTime ? { endDateTime: draft.endDateTime } : {}),
    location: draft.location.trim(),
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(websiteUrl ? { websiteUrl } : {}),
  };
};

/**
 * The editor's display order: start date DESCENDING — the furthest-future
 * event first, past ones sinking to the bottom. There is no manual reorder:
 * public placement is automatic from the dates.
 */
export const sortForEditor = <T extends SiteEvent>(events: readonly T[]): T[] =>
  [...events].sort(
    (a, b) => new Date(b.startDateTime || 0).getTime() - new Date(a.startDateTime || 0).getTime(),
  );
