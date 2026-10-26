import type { SiteEvent } from '@simple-site/interfaces';

/**
 * DISPLAY-ONLY search and sort of the events list tab. Nothing here ever
 * reaches the draft: the stored order stays start-date descending (see
 * `sortForEditor`), these helpers only decide which rows the admin sees and in
 * which order the editor paints them.
 */

/** The event fields search, sort and the date filter read — from the shared contract. */
export type SearchableEvent = Pick<SiteEvent, 'name' | 'description' | 'startDateTime' | 'endDateTime'>;

/** Sort options, in the order the selector lists them (first one is the default). */
export const EVENT_SORT_CRITERIA = ['startDesc', 'startAsc', 'nameAsc', 'nameDesc'] as const;

/** How the list is ordered on screen — each value has a `page.manage.events.sort.*` label. */
export type EventSortCriterion = (typeof EVENT_SORT_CRITERIA)[number];

/** Start date, newest first — the public agenda's own order, and the stored one. */
export const DEFAULT_EVENT_SORT: EventSortCriterion = 'startDesc';

/** Combining marks left behind by an NFD decomposition (é → e + ´). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** `[label](target)` / `![alt](target)`: the visible text is searchable, the target is not. */
const MARKDOWN_LINK = /!?\[([^\]]*)\]\((?:[^)]*)\)/g;

/**
 * Inline markers that must not split a word: `**Régate**`, `` `Régate` ``,
 * `~~Régate~~`, `#Régate`, `> Régate` all have to match "regate". Underscores
 * are deliberately NOT removed — they stay word separators, so `spring_regatta`
 * still matches "regatta".
 */
const MARKDOWN_MARKERS = /[*`~#>\\]/g;

/** Regex metacharacters of a typed query, so `(`, `.` or `*` match literally. */
const REGEXP_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

/** A match only counts at the start of a word: string start, or after a non-letter/digit. */
const WORD_START = '(?:^|[^\\p{L}\\p{N}])';

/**
 * The comparable form of a piece of text, applied to BOTH the stored text and
 * the typed query — which is what makes the search accent-insensitive in both
 * directions ("regate" finds "Régate", "régate" finds "Regate"):
 * diacritics dropped, lowercased, markdown formatting removed, spaces collapsed.
 */
export const normalizeForSearch = (text: string): string =>
  text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(MARKDOWN_LINK, '$1 ')
    .replace(MARKDOWN_MARKERS, '')
    .replace(/\s+/g, ' ')
    .trim();

/** The normalized query split into tokens — every one of them must match. */
const searchTokens = (query: string): string[] => normalizeForSearch(query).split(' ').filter(Boolean);

/** One word-start matcher per token; an empty query compiles to no matcher at all. */
const compileSearch = (query: string): RegExp[] =>
  searchTokens(query).map(
    (token) => new RegExp(`${WORD_START}${token.replace(REGEXP_METACHARACTERS, '\\$&')}`, 'u'),
  );

/** The searchable text of one event: its name and its description. */
const searchableText = (event: SearchableEvent): string =>
  `${normalizeForSearch(event.name)} ${normalizeForSearch(event.description ?? '')}`;

const matchesCompiled = (event: SearchableEvent, matchers: readonly RegExp[]): boolean => {
  if (matchers.length === 0) return true;
  const text = searchableText(event);
  return matchers.every((matcher) => matcher.test(text));
};

/**
 * True when every word of `query` starts a word of the event's name or
 * description. An empty (or markdown-only) query matches everything.
 */
export const matchesEventSearch = (event: SearchableEvent, query: string): boolean =>
  matchesCompiled(event, compileSearch(query));

/** The events matching `query`, in their input order (the query is compiled once). */
export const filterEvents = <T extends SearchableEvent>(events: readonly T[], query: string): T[] => {
  const matchers = compileSearch(query);
  return matchers.length === 0 ? [...events] : events.filter((event) => matchesCompiled(event, matchers));
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

/** `'YYYY-MM'` as a year and a month index, or null when the bound is open or unreadable. */
const readMonth = (month: string): { year: number; monthIndex: number } | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year: Number(match[1]), monthIndex };
};

/** First local instant of a bound month (`offset: 1` → first instant of the NEXT one). */
const monthInstant = (month: string, offset = 0): number | null => {
  const parsed = readMonth(month);
  return parsed === null ? null : new Date(parsed.year, parsed.monthIndex + offset, 1).getTime();
};

/** True when NEITHER bound is usable — the filter then lets every event through. */
export const isEmptyMonthRange = (range: EventMonthRange): boolean =>
  monthInstant(range.from) === null && monthInstant(range.to) === null;

/**
 * True when the event's own span overlaps the filtered months — the useful
 * reading of a date filter on a list of intervals: an event running from
 * December to January shows up under either month. An event with no start
 * date yet is ALWAYS kept: it has no date to compare, and it is the one row
 * the admin has to reach (it is what holds the save back).
 */
export const matchesEventMonthRange = (event: SearchableEvent, range: EventMonthRange): boolean => {
  if (!event.startDateTime) return true;
  const from = monthInstant(range.from);
  // The upper bound is inclusive, so compare against the start of the month AFTER it.
  const toExclusive = monthInstant(range.to, 1);
  const start = startedAt(event);
  const end = event.endDateTime ? startedAt({ ...event, startDateTime: event.endDateTime }) : start;
  if (from !== null && end < from) return false;
  if (toExclusive !== null && start >= toExclusive) return false;
  return true;
};

/** The events overlapping `range`, in their input order. */
export const filterEventsByMonthRange = <T extends SearchableEvent>(
  events: readonly T[],
  range: EventMonthRange,
): T[] =>
  isEmptyMonthRange(range) ? [...events] : events.filter((event) => matchesEventMonthRange(event, range));

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
