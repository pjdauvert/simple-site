import { describe, it, expect } from 'vitest';
import type { SiteEvent } from '@simple-site/interfaces';
import {
  EMPTY_EVENT_DAY_RANGE,
  defaultSearchFromDay,
  filterEventsByDayRange,
  isEmptyDayRange,
  matchesEventDayRange,
  matchesTexts,
  compileSearch,
  monthFirstDay,
  monthLastDay,
  monthOfDay,
  normalizeForSearch,
  searchEvents,
} from './eventSearchRules';

/** A local instant — the search model works on the viewer's calendar days. */
const local = (year: number, month: number, day: number, hour = 10): string =>
  new Date(year, month - 1, day, hour).toISOString();

const event = (overrides: Partial<SiteEvent> & Pick<SiteEvent, 'slug'>): SiteEvent => ({
  name: 'Event',
  location: 'Bordeaux',
  startDateTime: local(2027, 5, 10),
  ...overrides,
});

describe('text matching (shared with the admin list)', () => {
  it('matches word starts across every searchable field, accents and markdown aside', () => {
    const festival = event({
      slug: 'summer-festival',
      name: 'Été Musical',
      description: 'Trois jours de **concerts** sur les [quais](https://example.test/quais).',
      location: 'Place de la Bourse, Bordeaux',
    });
    const texts = [festival.name, festival.description, festival.location];

    expect(matchesTexts(texts, compileSearch('ete'))).toBe(true); // accents aside
    expect(matchesTexts(texts, compileSearch('concerts'))).toBe(true); // markdown aside
    expect(matchesTexts(texts, compileSearch('bourse'))).toBe(true); // the PLACE counts
    expect(matchesTexts(texts, compileSearch('quais'))).toBe(true); // a link label, not its target
    expect(matchesTexts(texts, compileSearch('example.test'))).toBe(false);
    expect(matchesTexts(texts, compileSearch('oncert'))).toBe(false); // word starts only
    // Every token must match, in any field.
    expect(matchesTexts(texts, compileSearch('ete bourse'))).toBe(true);
    expect(matchesTexts(texts, compileSearch('ete nantes'))).toBe(false);
    expect(matchesTexts(texts, compileSearch('   '))).toBe(true); // no query → everything
  });

  it('normalizes both sides the same way', () => {
    expect(normalizeForSearch('**Régate**  du Printemps')).toBe('regate du printemps');
  });
});

describe('day bounds', () => {
  it('reads months into inclusive day bounds', () => {
    expect(monthFirstDay('2027-02')).toBe('2027-02-01');
    expect(monthLastDay('2027-02')).toBe('2027-02-28'); // not a leap year
    expect(monthLastDay('2028-02')).toBe('2028-02-29'); // leap year
    expect(monthLastDay('2027-12')).toBe('2027-12-31');
    expect(monthOfDay('2027-05-10')).toBe('2027-05');
    expect(monthFirstDay('2027-13')).toBe(''); // malformed → no bound
    expect(monthOfDay('nope')).toBe('');
  });

  it('keeps an event whose span overlaps the bounds', () => {
    const newYear = event({ slug: 'new-year', startDateTime: local(2027, 12, 28), endDateTime: local(2028, 1, 3, 22) });
    expect(matchesEventDayRange(newYear, { from: '2027-12-01', to: '2027-12-31' })).toBe(true);
    expect(matchesEventDayRange(newYear, { from: '2028-01-01', to: '2028-01-31' })).toBe(true);
    expect(matchesEventDayRange(newYear, { from: '2028-02-01', to: '' })).toBe(false);
    expect(matchesEventDayRange(newYear, { from: '', to: '2027-11-30' })).toBe(false);
    // The bound days themselves count.
    expect(matchesEventDayRange(newYear, { from: '2027-12-28', to: '2027-12-28' })).toBe(true);
    expect(matchesEventDayRange(newYear, { from: '2028-01-03', to: '2028-01-03' })).toBe(true);
  });

  it('lets everything through without a usable bound', () => {
    expect(isEmptyDayRange(EMPTY_EVENT_DAY_RANGE)).toBe(true);
    expect(isEmptyDayRange({ from: '2027-05', to: 'nope' })).toBe(true); // months are not days
    const events = [event({ slug: 'a' }), event({ slug: 'b' })];
    expect(filterEventsByDayRange(events, EMPTY_EVENT_DAY_RANGE)).toEqual(events);
  });
});

describe('the search page’s starting point', () => {
  const now = new Date(2027, 4, 10, 12); // 10 May 2027, local

  it('starts today while anything is still to come', () => {
    const events = [event({ slug: 'past', startDateTime: local(2026, 1, 1) }), event({ slug: 'next' })];
    expect(defaultSearchFromDay(events, now)).toBe('2027-05-10');
  });

  it('counts an event that is still running today as upcoming', () => {
    const ongoing = event({ slug: 'ongoing', startDateTime: local(2027, 5, 8), endDateTime: local(2027, 5, 10, 23) });
    expect(defaultSearchFromDay([ongoing], now)).toBe('2027-05-10');
  });

  it('falls back to the last event that took place when nothing is upcoming', () => {
    const events = [
      event({ slug: 'older', startDateTime: local(2026, 1, 1) }),
      event({ slug: 'latest', startDateTime: local(2027, 3, 20) }),
    ];
    expect(defaultSearchFromDay(events, now)).toBe('2027-03-20');
  });

  it('falls back to today with no events at all', () => {
    expect(defaultSearchFromDay([], now)).toBe('2027-05-10');
  });
});

describe('searchEvents', () => {
  const texts = (e: SiteEvent) => [e.name, e.description, e.location];
  const events = [
    event({ slug: 'autumn', name: 'Autumn Fair', startDateTime: local(2027, 10, 3) }),
    event({ slug: 'spring', name: 'Spring Regatta', startDateTime: local(2027, 4, 5), location: 'Quai des Chartrons' }),
    event({ slug: 'summer', name: 'Summer Festival', startDateTime: local(2027, 7, 12) }),
  ];

  it('lists the matching events in calendar order, soonest first', () => {
    const found = searchEvents(events, { query: '', from: '2027-01-01', to: '' }, texts);
    expect(found.map((e) => e.slug)).toEqual(['spring', 'summer', 'autumn']);
  });

  it('combines the query with the bounds', () => {
    expect(
      searchEvents(events, { query: 'chartrons', from: '2027-01-01', to: '' }, texts).map((e) => e.slug),
    ).toEqual(['spring']);
    expect(searchEvents(events, { query: 'chartrons', from: '2027-06-01', to: '' }, texts)).toEqual([]);
    expect(
      searchEvents(events, { query: '', from: '2027-06-01', to: '2027-08-31' }, texts).map((e) => e.slug),
    ).toEqual(['summer']);
  });
});
