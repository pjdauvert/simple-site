import { describe, it, expect } from 'vitest';
import type { SiteEvent } from '@simple-site/interfaces';
import { buildEventCalendar, eventDays, weekdayColumns } from './eventCalendar';

const local = (year: number, month: number, day: number, hour = 10): string =>
  new Date(year, month - 1, day, hour).toISOString();

const event = (slug: string, start: string, end?: string): SiteEvent => ({
  slug,
  name: slug,
  location: 'Bordeaux',
  startDateTime: start,
  ...(end ? { endDateTime: end } : {}),
});

describe('weekdayColumns', () => {
  it('orders the seven columns from the design’s first day', () => {
    // `Date#getDay`: 0 = Sunday.
    expect(weekdayColumns('monday')).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdayColumns('sunday')).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('eventDays', () => {
  it('covers every local day of the event, both ends included', () => {
    expect(eventDays(event('one', local(2027, 5, 10)))).toEqual(['2027-05-10']);
    expect(eventDays(event('three', local(2027, 5, 10), local(2027, 5, 12, 22)))).toEqual([
      '2027-05-10',
      '2027-05-11',
      '2027-05-12',
    ]);
  });

  it('crosses months and years', () => {
    expect(eventDays(event('turn', local(2027, 12, 30), local(2028, 1, 2, 23)))).toEqual([
      '2027-12-30',
      '2027-12-31',
      '2028-01-01',
      '2028-01-02',
    ]);
  });

  it('yields the start day alone for an unusable range', () => {
    expect(eventDays(event('backwards', local(2027, 5, 10), local(2027, 5, 1)))).toEqual(['2027-05-10']);
    expect(eventDays({ startDateTime: 'nonsense' } as SiteEvent)).toEqual([]);
  });
});

describe('buildEventCalendar', () => {
  it('builds one grid per occupied month, in order, and skips the empty ones', () => {
    const months = buildEventCalendar(
      [event('may', local(2027, 5, 10)), event('july', local(2027, 7, 1))],
      'monday',
    );
    // June holds nothing: it is not represented at all.
    expect(months.map((month) => month.key)).toEqual(['2027-05', '2027-07']);
  });

  it('nothing at all → no month (the panel has nothing to show)', () => {
    expect(buildEventCalendar([], 'monday')).toEqual([]);
  });

  it('pads each month to whole weeks from the design’s first day', () => {
    // 1 May 2027 is a Saturday.
    const [may] = buildEventCalendar([event('may', local(2027, 5, 10))], 'monday');
    expect(may.cells).toHaveLength(42); // 6 weeks of 7
    // Monday-first: Saturday sits in the 6th column, so five blanks come first.
    expect(may.cells.slice(0, 5).every((cell) => cell === null)).toBe(true);
    expect(may.cells[5]).toMatchObject({ day: 1, date: '2027-05-01' });

    const [sundayMay] = buildEventCalendar([event('may', local(2027, 5, 10))], 'sunday');
    // Sunday-first: Saturday is the last column — six blanks.
    expect(sundayMay.cells.slice(0, 6).every((cell) => cell === null)).toBe(true);
    expect(sundayMay.cells[6]).toMatchObject({ day: 1 });
  });

  it('marks every day an event covers, and keeps several events on one day', () => {
    const months = buildEventCalendar(
      [
        event('festival', local(2027, 5, 10), local(2027, 5, 12, 22)),
        event('market', local(2027, 5, 12)),
      ],
      'monday',
    );
    const days = months[0].cells.filter((cell) => cell && cell.slugs.length > 0);
    expect(days.map((cell) => [cell?.date, cell?.slugs])).toEqual([
      ['2027-05-10', ['festival']],
      ['2027-05-11', ['festival']],
      ['2027-05-12', ['festival', 'market']],
    ]);
  });
});
