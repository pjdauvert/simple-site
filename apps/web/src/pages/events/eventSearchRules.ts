import type { SiteEvent } from '@simple-site/interfaces';
import { eventEnd, eventStart, localDateISO } from './eventDates';

/**
 * The event SEARCH RULES — what it MEANS for a query or a date range to match
 * an event. Shared by the public search page and the admin list tab (whose
 * list-level sorting and month bounds live in
 * `components/manage/events/eventsListSearch.ts`, built on top of this).
 * Pure and display-only — nothing here ever reaches the stored config.
 *
 * The public page matches the TRANSLATED texts the visitor reads, the admin
 * matches the stored defaults it edits; both pass the texts in, so the rules
 * live in one place.
 */

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

/** One word-start matcher per query token; an empty query compiles to no matcher. */
export const compileSearch = (query: string): RegExp[] =>
  normalizeForSearch(query)
    .split(' ')
    .filter(Boolean)
    .map((token) => new RegExp(`${WORD_START}${token.replace(REGEXP_METACHARACTERS, '\\$&')}`, 'u'));

/**
 * True when EVERY token of the query starts a word of one of `texts` — the
 * searchable fields of an event (its name, description, location…), already
 * resolved to what the reader sees.
 */
export const matchesTexts = (texts: readonly (string | undefined)[], matchers: readonly RegExp[]): boolean => {
  if (matchers.length === 0) return true;
  const haystack = texts.map((text) => normalizeForSearch(text ?? '')).join(' ');
  return matchers.every((matcher) => matcher.test(haystack));
};

/**
 * Inclusive DAY bounds of a date filter (`'YYYY-MM-DD'`, `''` for an open
 * side), compared on the viewer's local calendar days — the same ground the
 * agenda classifies events on.
 */
export interface EventDayRange {
  from: string;
  to: string;
}

export const EMPTY_EVENT_DAY_RANGE: EventDayRange = { from: '', to: '' };

/** A readable `'YYYY-MM-DD'`, or '' when the bound is open or malformed. */
const readDay = (day: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(day.trim()) ? day.trim() : '');

/** First day of a `'YYYY-MM'` month, or '' when the month is open or malformed. */
export const monthFirstDay = (month: string): string =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(month.trim()) ? `${month.trim()}-01` : '';

/** Last day of a `'YYYY-MM'` month (28–31, leap years included), or ''. */
export const monthLastDay = (month: string): string => {
  const first = monthFirstDay(month);
  if (!first) return '';
  const [year, monthNumber] = month.trim().split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  return localDateISO(new Date(year, monthNumber, 0));
};

/** The `'YYYY-MM'` a local day belongs to, or '' when the day is open/malformed. */
export const monthOfDay = (day: string): string => readDay(day).slice(0, 7);

/** True when neither bound is usable — the filter then lets every event through. */
export const isEmptyDayRange = (range: EventDayRange): boolean =>
  !readDay(range.from) && !readDay(range.to);

/**
 * True when the event's own span overlaps the filtered days — the useful
 * reading of a date filter on a list of intervals: an event running from
 * December to January answers to either month. An event with no start date
 * yet is ALWAYS kept: it has no date to compare, and in the admin it is the
 * row holding the save back.
 */
export const matchesEventDayRange = (
  event: Pick<SiteEvent, 'startDateTime' | 'endDateTime'>,
  range: EventDayRange,
): boolean => {
  if (!event.startDateTime) return true;
  const from = readDay(range.from);
  const to = readDay(range.to);
  const start = localDateISO(eventStart(event));
  const end = localDateISO(eventEnd(event));
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
};

/** The events overlapping `range`, in their input order. */
export const filterEventsByDayRange = <T extends Pick<SiteEvent, 'startDateTime' | 'endDateTime'>>(
  events: readonly T[],
  range: EventDayRange,
): T[] => (isEmptyDayRange(range) ? [...events] : events.filter((event) => matchesEventDayRange(event, range)));

/** What the search page filters on: a typed query over the texts, plus day bounds. */
export interface EventSearchCriteria extends EventDayRange {
  query: string;
}

/**
 * Where the search page starts: TODAY — the visitor is looking for something
 * to attend. When nothing is upcoming, it falls back to the day of the LAST
 * event that took place, so the page opens on the most recent thing that
 * happened instead of an empty list the visitor has to work out how to fill.
 */
export const defaultSearchFromDay = (events: readonly SiteEvent[], now: Date): string => {
  const today = localDateISO(now);
  const upcoming = events.some((event) => localDateISO(eventEnd(event)) >= today);
  if (upcoming) return today;
  const lastPast = events
    .map((event) => localDateISO(eventStart(event)))
    .sort()
    .at(-1);
  return lastPast ?? today;
};

/**
 * The listed events: those matching the query over `texts(event)` AND
 * overlapping the day bounds, in CALENDAR order (soonest first) — the search
 * page is read forwards, unlike the admin list and the agenda's past sections.
 */
export const searchEvents = (
  events: readonly SiteEvent[],
  criteria: EventSearchCriteria,
  texts: (event: SiteEvent) => readonly (string | undefined)[],
): SiteEvent[] => {
  const matchers = compileSearch(criteria.query);
  return filterEventsByDayRange(events, { from: criteria.from, to: criteria.to })
    .filter((event) => matchesTexts(texts(event), matchers))
    .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime());
};
