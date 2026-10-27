import type { IntlShape } from 'react-intl';
import type { SiteEvent } from '@simple-site/interfaces';
import type { ResolvedAgendaDesign } from './eventDisplay';

/**
 * Date classification of the public agenda (web-only — the functions never
 * interpret event dates). Instants are stored as UTC ISO strings; every rule
 * here works on the VIEWER's local calendar day, so "today" and "past" follow
 * the visitor's clock. `now` is always injected for testability. Date-only
 * strings are never parsed (`new Date('YYYY-MM-DD')` would read as UTC and
 * shift near midnight) — day comparisons go through {@link localDateISO}.
 */

/**
 * The event's dates as instants (stored UTC, rendered/classified locally).
 * Only the two date fields are read, so a half-filled draft row works too.
 */
export const eventStart = (event: Pick<SiteEvent, 'startDateTime'>): Date => new Date(event.startDateTime);
export const eventEnd = (event: Pick<SiteEvent, 'startDateTime' | 'endDateTime'>): Date =>
  new Date(event.endDateTime ?? event.startDateTime);

/** The `YYYY-MM-DD` of an instant in the viewer's local timezone. */
export const localDateISO = (instant: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
};

/** Midnight AFTER the instant's local day — the moment its day is over. */
const startOfNextLocalDay = (instant: Date): Date =>
  new Date(instant.getFullYear(), instant.getMonth(), instant.getDate() + 1);

/** True when start and end fall on different local days. */
export const isMultiDay = (event: Pick<SiteEvent, 'startDateTime' | 'endDateTime'>): boolean =>
  localDateISO(eventStart(event)) !== localDateISO(eventEnd(event));

/** Past once the last day is over — an event ending today is NOT yet past. */
export const isPastEvent = (event: SiteEvent, now: Date): boolean =>
  now.getTime() >= startOfNextLocalDay(eventEnd(event)).getTime();

/**
 * Which date sentence the featured (next) event shows:
 * - `today`  — single-day, happening today ("Aujourd'hui, {date} à partir de {time}")
 * - `single` — single-day, later ("Le {date} à partir de {time}")
 * - `range`  — multi-day, not started ("Du {startDate} au {endDate}")
 * - `until`  — multi-day, started but not over ("Jusqu'au {endDate}")
 */
export type FeaturedDateRule = 'today' | 'single' | 'range' | 'until';

export const featuredDateRule = (event: SiteEvent, now: Date): FeaturedDateRule => {
  if (!isMultiDay(event)) {
    return localDateISO(eventStart(event)) === localDateISO(now) ? 'today' : 'single';
  }
  return now.getTime() >= eventStart(event).getTime() ? 'until' : 'range';
};

/** Dates in a list are plain and numeric — the long sentence is the featured event's. */
const LIST_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

/** Shown instead of a date the admin has not filled in yet. */
const NO_DATE = '—';

/**
 * The date sentence of an event in a LIST — the agenda's cards, the search
 * page's rows AND the admin's own list, which must never disagree with them:
 * the start day alone, or the range once the event spans several local days
 * ({@link isMultiDay}, so a single day carrying an end TIME still reads as one
 * date). An unfilled start — only reachable from a half-filled admin row —
 * renders as a dash.
 */
export const formatEventDates = (
  intl: IntlShape,
  event: Pick<SiteEvent, 'startDateTime' | 'endDateTime'>,
): string => {
  if (!event.startDateTime) return NO_DATE;
  const startDate = intl.formatDate(eventStart(event), LIST_DATE);
  if (!isMultiDay(event)) return startDate;
  return intl.formatMessage(
    { id: 'page.events.card.range' },
    { startDate, endDate: intl.formatDate(eventEnd(event), LIST_DATE) },
  );
};

/** One agenda year section: its (viewer-local) year and events, most recent first. */
export interface YearBucket {
  year: number;
  events: SiteEvent[];
}

export interface ClassifiedEvents {
  /** The featured event: first non-past by start date (an ongoing one sorts first naturally). */
  next: SiteEvent | null;
  /** The non-past events after `next`, soonest first. */
  upcoming: SiteEvent[];
  /** Past events grouped by local start year — years and events both descending. */
  pastYears: YearBucket[];
}

/** Places every event into its agenda section from its dates alone. */
export const classifyEvents = (events: readonly SiteEvent[], now: Date): ClassifiedEvents => {
  const chronological = [...events].sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime());
  const future = chronological.filter((event) => !isPastEvent(event, now));
  const past = chronological.filter((event) => isPastEvent(event, now)).reverse();

  const pastYears: YearBucket[] = [];
  for (const event of past) {
    const year = eventStart(event).getFullYear();
    const bucket = pastYears.at(-1);
    if (bucket?.year === year) bucket.events.push(event);
    else pastYears.push({ year, events: [event] });
  }

  return { next: future[0] ?? null, upcoming: future.slice(1), pastYears };
};

/**
 * Applies the design's past-events visibility: `none` hides the section,
 * `from` keeps events whose local start day is on/after the cut-off date
 * (plain `YYYY-MM-DD` string comparison), `all` keeps everything.
 */
export const filterVisiblePast = (pastYears: YearBucket[], design: ResolvedAgendaDesign): YearBucket[] => {
  if (design.pastEventsMode === 'none') return [];
  if (design.pastEventsMode === 'from' && design.pastEventsFromDate) {
    const cutoff = design.pastEventsFromDate;
    return pastYears
      .map((bucket) => ({ ...bucket, events: bucket.events.filter((event) => localDateISO(eventStart(event)) >= cutoff) }))
      .filter((bucket) => bucket.events.length > 0);
  }
  return pastYears;
};
