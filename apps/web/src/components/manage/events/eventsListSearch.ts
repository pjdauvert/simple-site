import type { SiteEvent } from '@simple-site/interfaces';
import {
  compileSearch,
  filterEventsByDayRange,
  matchesEventDayRange,
  matchesTexts,
  monthFirstDay,
  monthLastDay,
  type EventDayRange,
} from '../../../pages/events/eventSearchRules';

/** The matching rules themselves are shared with the public search page. */
export { normalizeForSearch } from '../../../pages/events/eventSearchRules';

/**
 * How the events LIST TAB narrows and orders what it paints: the admin's sort
 * selector, and a date filter expressed in whole MONTHS rather than days. The
 * matching rules it stands on — what a query matches, what a day range selects
 * — belong to `pages/events/eventSearchRules.ts` and are shared with the
 * public search page; only the list-level presentation lives here.
 *
 * Nothing here ever reaches the draft: the stored order stays start-date
 * descending (see `sortForEditor`), these helpers only decide which rows the
 * admin sees and in which order the editor paints them.
 */

/** The event fields search, sort and the date filter read — from the shared contract. */
export type SearchableEvent = Pick<SiteEvent, 'name' | 'description' | 'startDateTime' | 'endDateTime'>;

/** Sort options, in the order the selector lists them (first one is the default). */
export const EVENT_SORT_CRITERIA = ['startDesc', 'startAsc', 'nameAsc', 'nameDesc'] as const;

/** How the list is ordered on screen — each value has a `page.manage.events.sort.*` label. */
export type EventSortCriterion = (typeof EVENT_SORT_CRITERIA)[number];

/** Start date, newest first — the public agenda's own order, and the stored one. */
export const DEFAULT_EVENT_SORT: EventSortCriterion = 'startDesc';

/**
 * The admin searches the texts it EDITS — the stored translation defaults —
 * while the public page searches the translations a visitor reads; the
 * matching rules are the same (see `pages/events/eventSearchRules.ts`).
 */
const searchableTexts = (event: SearchableEvent): string[] => [event.name, event.description ?? ''];

/**
 * True when every word of `query` starts a word of the event's name or
 * description. An empty (or markdown-only) query matches everything.
 */
export const matchesEventSearch = (event: SearchableEvent, query: string): boolean =>
  matchesTexts(searchableTexts(event), compileSearch(query));

/** The events matching `query`, in their input order (the query is compiled once). */
export const filterEvents = <T extends SearchableEvent>(events: readonly T[], query: string): T[] => {
  const matchers = compileSearch(query);
  return matchers.length === 0 ? [...events] : events.filter((event) => matchesTexts(searchableTexts(event), matchers));
};

/** An event's start instant as a number; a missing or unparsable date reads as the epoch. */
const startedAt = (event: SearchableEvent): number => {
  const time = new Date(event.startDateTime || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Bounds of the list's DATE FILTER, each a month the admin typed as a year and
 * a month (`'YYYY-MM'`), or `''` for an open side. Both are INCLUSIVE whole
 * months: `from: '2026-03'` opens on March 1st, `to: '2026-03'` closes with
 * the last instant of March.
 *
 * Months are read in the ADMIN's timezone — the one the event dialog edits
 * dates in — so "March" is their March, not UTC's.
 */
export interface EventMonthRange {
  from: string;
  to: string;
}

/** No bound on either side: every event passes. */
export const EMPTY_EVENT_MONTH_RANGE: EventMonthRange = { from: '', to: '' };

/** The two months as the shared day-range filter reads them. */
const monthRangeDays = (range: EventMonthRange): EventDayRange => ({
  from: monthFirstDay(range.from),
  to: monthLastDay(range.to),
});

/** `isEmptyDayRange` of the shared rules, read as months. */
export const isEmptyMonthRange = (range: EventMonthRange): boolean =>
  !monthFirstDay(range.from) && !monthFirstDay(range.to);

/** {@link matchesEventDayRange} over whole months — same overlap rule. */
export const matchesEventMonthRange = (event: SearchableEvent, range: EventMonthRange): boolean =>
  matchesEventDayRange(event, monthRangeDays(range));

/** The events overlapping `range`, in their input order. */
export const filterEventsByMonthRange = <T extends SearchableEvent>(
  events: readonly T[],
  range: EventMonthRange,
): T[] => filterEventsByDayRange(events, monthRangeDays(range));

/**
 * A copy of `events` in the admin's chosen order. Names compare through
 * `Intl.Collator` so the order is the reader's: `sensitivity: 'base'` makes it
 * accent- and case-tolerant ("Éclipse" sits next to "eclipse", not after "Z"),
 * `numeric` keeps "Régate 2" before "Régate 10".
 */
export const sortEvents = <T extends SearchableEvent>(
  events: readonly T[],
  criterion: EventSortCriterion,
  locale?: string,
): T[] => {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return [...events].sort((a, b) => {
    switch (criterion) {
      case 'startAsc':
        return startedAt(a) - startedAt(b);
      case 'nameAsc':
        return collator.compare(a.name, b.name);
      case 'nameDesc':
        return collator.compare(b.name, a.name);
      case 'startDesc':
      default:
        return startedAt(b) - startedAt(a);
    }
  });
};
