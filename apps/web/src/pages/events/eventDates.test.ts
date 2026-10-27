import { describe, it, expect } from 'vitest';
import type { SiteEvent } from '@simple-site/interfaces';
import {
  classifyEvents,
  featuredDateRule,
  filterVisiblePast,
  isMultiDay,
  isPastEvent,
  localDateISO,
} from './eventDates';
import { resolveAgendaDesign } from './eventDisplay';

const AGENDA_DEFAULTS = resolveAgendaDesign(undefined);

/**
 * Fixtures build instants FROM LOCAL wall-clock components and store their UTC
 * ISO form — exactly what the admin flow produces — so the local-day rules
 * under test hold in whatever timezone the suite runs.
 */
const utc = (year: number, month: number, day: number, hour = 10, minute = 0): string =>
  new Date(year, month - 1, day, hour, minute).toISOString();

const event = (slug: string, start: string, end?: string): SiteEvent => ({
  slug,
  name: slug,
  startDateTime: start,
  ...(end ? { endDateTime: end } : {}),
  location: 'Somewhere',
});

// The suite's fixed clock: 2026-08-16, noon LOCAL time.
const NOW = new Date(2026, 7, 16, 12, 0);

describe('localDateISO / isMultiDay', () => {
  it('reads the local calendar day of a stored UTC instant', () => {
    expect(localDateISO(new Date(utc(2026, 8, 16, 9)))).toBe('2026-08-16');
  });

  it('follows the VIEWER timezone near midnight UTC — a getUTC* regression would fail here off-UTC', () => {
    // Independent oracle: `en-CA` formats as YYYY-MM-DD in the runtime timezone.
    // The suite pins a non-UTC TZ (vitest.config.ts), so on 23:30Z the local
    // day differs from the UTC day and a local/UTC mix-up becomes visible.
    const nearMidnightUtc = new Date('2026-08-16T23:30:00.000Z');
    expect(localDateISO(nearMidnightUtc)).toBe(nearMidnightUtc.toLocaleDateString('en-CA'));
  });

  it('is multi-day only when start and end fall on different local days', () => {
    expect(isMultiDay(event('same', utc(2026, 9, 12, 10), utc(2026, 9, 12, 23)))).toBe(false);
    expect(isMultiDay(event('two', utc(2026, 9, 12, 10), utc(2026, 9, 13, 1)))).toBe(true);
    expect(isMultiDay(event('open', utc(2026, 9, 12, 10)))).toBe(false);
  });
});

describe('isPastEvent', () => {
  it('is not past while its (last) day is running — even after the start time', () => {
    expect(isPastEvent(event('today-early', utc(2026, 8, 16, 9)), NOW)).toBe(false);
    expect(isPastEvent(event('ends-today', utc(2026, 8, 14, 9), utc(2026, 8, 16, 9)), NOW)).toBe(false);
  });

  it('is past from the local midnight after its last day', () => {
    expect(isPastEvent(event('yesterday', utc(2026, 8, 15, 9)), NOW)).toBe(true);
    expect(isPastEvent(event('ended-yesterday', utc(2026, 8, 10, 9), utc(2026, 8, 15, 23)), NOW)).toBe(true);
  });

  it('flips exactly AT the local midnight after the last day (inclusive boundary)', () => {
    const endsAug15 = event('boundary', utc(2026, 8, 15, 9));
    const midnightAfter = new Date(2026, 7, 16, 0, 0, 0, 0);
    expect(isPastEvent(endsAug15, midnightAfter)).toBe(true);
    expect(isPastEvent(endsAug15, new Date(midnightAfter.getTime() - 1))).toBe(false);
  });
});

describe('featuredDateRule', () => {
  it('single-day: `today` when it happens today (even after its start time), else `single`', () => {
    expect(featuredDateRule(event('t', utc(2026, 8, 16, 9)), NOW)).toBe('today');
    expect(featuredDateRule(event('t', utc(2026, 8, 16, 20)), NOW)).toBe('today');
    expect(featuredDateRule(event('s', utc(2026, 9, 12, 20)), NOW)).toBe('single');
  });

  it('multi-day: `range` before the start instant, `until` once started', () => {
    expect(featuredDateRule(event('r', utc(2026, 9, 12, 10), utc(2026, 9, 14, 18)), NOW)).toBe('range');
    expect(featuredDateRule(event('u', utc(2026, 8, 16, 9), utc(2026, 8, 18, 18)), NOW)).toBe('until');
    // Starts today but later than now → still announced as a range.
    expect(featuredDateRule(event('r2', utc(2026, 8, 16, 20), utc(2026, 8, 18, 18)), NOW)).toBe('range');
    // The start instant itself counts as started (inclusive boundary).
    const start = utc(2026, 8, 16, 12);
    expect(featuredDateRule(event('b', start, utc(2026, 8, 18, 18)), new Date(start))).toBe('until');
  });
});

describe('classifyEvents', () => {
  const ongoing = event('ongoing', utc(2026, 8, 14, 9), utc(2026, 8, 18, 18));
  const soon = event('soon', utc(2026, 9, 12, 20));
  const later = event('later', utc(2026, 12, 5, 18));
  const lastMonth = event('last-month', utc(2026, 7, 10, 9));
  const olderSpring = event('older-spring', utc(2025, 5, 10, 9), utc(2025, 5, 11, 16));
  const olderFall = event('older-fall', utc(2025, 10, 2, 9));

  it('features the first non-past event — an ongoing one naturally wins', () => {
    const { next, upcoming } = classifyEvents([later, soon, ongoing], NOW);
    expect(next?.slug).toBe('ongoing');
    expect(upcoming.map((e) => e.slug)).toEqual(['soon', 'later']);
  });

  it('groups past events by local start year, years and events both descending', () => {
    const { pastYears } = classifyEvents([olderSpring, lastMonth, olderFall, soon], NOW);
    expect(pastYears.map((b) => b.year)).toEqual([2026, 2025]);
    expect(pastYears[1].events.map((e) => e.slug)).toEqual(['older-fall', 'older-spring']);
  });

  it('handles the empty and all-past lists', () => {
    expect(classifyEvents([], NOW)).toEqual({ next: null, upcoming: [], pastYears: [] });
    const { next, pastYears } = classifyEvents([lastMonth], NOW);
    expect(next).toBeNull();
    expect(pastYears).toHaveLength(1);
  });
});

describe('filterVisiblePast', () => {
  const buckets = classifyEvents(
    [
      event('recent', utc(2026, 3, 10, 9)),
      event('old', utc(2025, 5, 10, 9)),
    ],
    NOW,
  ).pastYears;

  it('`none` hides everything, `all` keeps everything', () => {
    expect(filterVisiblePast(buckets, { ...AGENDA_DEFAULTS, pastEventsMode: 'none' })).toEqual([]);
    expect(filterVisiblePast(buckets, AGENDA_DEFAULTS)).toEqual(buckets);
  });

  it('`from` keeps events starting on/after the cut-off (local day, inclusive)', () => {
    const filtered = filterVisiblePast(buckets, {
      ...AGENDA_DEFAULTS,
      pastEventsMode: 'from',
      pastEventsFromDate: localDateISO(new Date(2026, 2, 10)),
    });
    expect(filtered.map((b) => b.year)).toEqual([2026]);
    expect(filtered[0].events.map((e) => e.slug)).toEqual(['recent']);
  });

  it('`from` without a stored date behaves like `all`', () => {
    expect(filterVisiblePast(buckets, { ...AGENDA_DEFAULTS, pastEventsMode: 'from' })).toEqual(buckets);
  });
});
