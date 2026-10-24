import dayjs, { type Dayjs } from 'dayjs';
import { EVENT_SLUG_PATTERN, UrlOrPathSchema, type SiteEvent } from '@simple-site/interfaces';

/**
 * Pure editor-state helpers of the events list tab. Instants are STORED as UTC
 * ISO strings but EDITED in the ADMIN's own timezone, split into a date and an
 * optional time-of-day ({@link readWhen} / {@link buildWhen} are the only place
 * that translation happens — no timezone is ever shown or chosen in the UI).
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

/* ------------------------------------------------------------------ *
 * Stored UTC instants ↔ the dialog's local date / time fields
 * ------------------------------------------------------------------ */

/**
 * The date/time fields of the edit dialog, read in the admin's own timezone.
 * Times only exist while the event fits in a SINGLE local day: a multi-day
 * event is stored from the local start of its first day to the local end of
 * its last one (23:59), because the public agenda renders dates only for it —
 * there is no time to enter, so the dialog hides the time pickers.
 */
export interface EventWhenFields {
  /** Local calendar day the event starts on (midnight-normalized). */
  startDay: Dayjs | null;
  /** Local wall-clock start, only meaningful while not `multiDay`. */
  startTime: Dayjs | null;
  /** Local calendar day the event ends on — absent for an open single day. */
  endDay: Dayjs | null;
  /** Local wall-clock end, only meaningful while not `multiDay`. */
  endTime: Dayjs | null;
  /**
   * True when the end falls on a LATER local day than the start: the event
   * spans whole days and carries no times. An end day BEFORE the start day is
   * only an invalid in-between state (flagged by {@link validateEvents}), so it
   * keeps the times — fixing the date must not cost the admin their entries.
   */
  multiDay: boolean;
}

/** The subset a single picker edits; the untouched fields are re-read from the event. */
export type EventWhenPatch = Partial<Omit<EventWhenFields, 'multiDay'>>;

/** A stored instant as a local-timezone dayjs value (absent/unparsable → null). */
const parseStored = (iso: string | undefined): Dayjs | null => {
  if (!iso?.trim()) return null;
  const instant = dayjs(iso);
  return instant.isValid() ? instant : null;
};

/** A picker value as a usable local day (cleared/incomplete input → null). */
const asDay = (value: Dayjs | null | undefined): Dayjs | null =>
  value && value.isValid() ? value.startOf('day') : null;

/** `day` at the given local wall clock — the fallback applies when no time is set. */
const atLocalTime = (day: Dayjs, time: Dayjs | null | undefined, hour: number, minute: number): string =>
  day
    .hour(time?.isValid() ? time.hour() : hour)
    .minute(time?.isValid() ? time.minute() : minute)
    .second(0)
    .millisecond(0)
    .toISOString();

/** Reads a stored event into the dialog's local date/time fields. */
export const readWhen = (event: SiteEvent): EventWhenFields => {
  const start = parseStored(event.startDateTime);
  const end = parseStored(event.endDateTime);
  const multiDay = start !== null && end !== null && end.isAfter(start, 'day');
  return {
    startDay: start?.startOf('day') ?? null,
    startTime: multiDay ? null : start,
    endDay: end?.startOf('day') ?? null,
    endTime: multiDay ? null : end,
    multiDay,
  };
};

/**
 * Builds the stored UTC instants from the local fields — the single source of
 * the local → UTC translation:
 * - one local day: start at its (optional) time, else at the start of the day;
 *   end only when a time or an end date says so, defaulting to 23:59 local;
 * - several local days: times cannot be entered, so the event spans the whole
 *   period — start at 00:00 local of the first day, end at 23:59 local of the
 *   last one (an event is "past" only once its last local day is over).
 */
export const buildWhen = (fields: EventWhenFields): Pick<SiteEvent, 'startDateTime' | 'endDateTime'> => {
  const startDay = asDay(fields.startDay);
  // An end time with no end date ends the event on its own start day.
  const endDay = asDay(fields.endDay) ?? (fields.endTime?.isValid() ? startDay : null);
  const multiDay = startDay !== null && endDay !== null && endDay.isAfter(startDay, 'day');
  return {
    startDateTime: startDay ? atLocalTime(startDay, multiDay ? null : fields.startTime, 0, 0) : '',
    ...(endDay ? { endDateTime: atLocalTime(endDay, multiDay ? null : fields.endTime, 23, 59) } : {}),
  };
};

/** One picker's edit applied to an event: re-reads the other fields, rebuilds both instants. */
export const applyWhen = (event: EventDraft, patch: EventWhenPatch): EventDraft => {
  const { startDateTime, endDateTime } = buildWhen({ ...readWhen(event), ...patch });
  return { ...event, startDateTime, endDateTime };
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
