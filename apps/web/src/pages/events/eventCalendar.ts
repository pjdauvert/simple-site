import type { EventWeekStart, SiteEvent } from '@simple-site/interfaces';
import { eventEnd, eventStart, localDateISO } from './eventDates';

/**
 * Calendar model of the search page's side panel: the listed events laid out
 * as month grids of seven columns. Pure and timezone-local like the rest of
 * the agenda's date logic — a day is a day on the VIEWER's calendar.
 *
 * Only the months the listed events actually occupy are built, and nothing
 * beyond the last of them: a panel scrolling through empty months would say
 * nothing while costing the visitor every one of those rows.
 */

/** One day cell: the local day it stands for and the events covering it. */
export interface CalendarDay {
  /** `YYYY-MM-DD`, local. */
  date: string;
  /** Day of the month, 1-based — what the cell shows. */
  day: number;
  /** Slugs of the events covering this day, in the order they were listed. */
  slugs: string[];
}

/** One month grid: leading/trailing `null`s pad it to whole weeks of seven. */
export interface CalendarMonth {
  /** `YYYY-MM`, local — stable key and heading source. */
  key: string;
  year: number;
  /** Month index, 0-based (`Date`'s own convention). */
  month: number;
  cells: (CalendarDay | null)[];
}

/** Monday-first (ISO) or Sunday-first column order, as the design says. */
const firstColumn = (weekStartsOn: EventWeekStart): number => (weekStartsOn === 'sunday' ? 0 : 1);

/**
 * Weekday indexes (`Date#getDay`) in the design's column order — the panel's
 * header row renders a label per entry, so the two always agree.
 */
export const weekdayColumns = (weekStartsOn: EventWeekStart): number[] => {
  const first = firstColumn(weekStartsOn);
  return Array.from({ length: 7 }, (_, column) => (first + column) % 7);
};

/** Every local day an event covers, start and end included. */
export const eventDays = (event: Pick<SiteEvent, 'startDateTime' | 'endDateTime'>): string[] => {
  const start = eventStart(event);
  const end = eventEnd(event);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days: string[] = [];
  // Walk local midnights: date arithmetic on a local Date handles DST shifts
  // and month/year ends on its own.
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = localDateISO(end);
  // A malformed range (end before start) yields the start day alone.
  for (let guard = 0; guard < 2000; guard += 1) {
    const day = localDateISO(cursor);
    days.push(day);
    if (day >= last) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

/**
 * The month grids covering `events` — one per month holding at least one of
 * their days, in chronological order, each padded to whole weeks starting on
 * the design's first day.
 */
export const buildEventCalendar = (
  events: readonly SiteEvent[],
  weekStartsOn: EventWeekStart,
): CalendarMonth[] => {
  /** Days holding events, keyed `YYYY-MM-DD` → slugs. */
  const byDay = new Map<string, string[]>();
  for (const event of events) {
    for (const day of eventDays(event)) {
      const slugs = byDay.get(day);
      if (slugs) slugs.push(event.slug);
      else byDay.set(day, [event.slug]);
    }
  }
  if (byDay.size === 0) return [];

  const monthKeys = [...new Set([...byDay.keys()].map((day) => day.slice(0, 7)))].sort();
  const first = firstColumn(weekStartsOn);

  return monthKeys.map((key) => {
    const [year, monthNumber] = key.split('-').map(Number);
    const month = monthNumber - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Columns to skip before the 1st, in the design's column order.
    const lead = (new Date(year, month, 1).getDay() - first + 7) % 7;
    const cells: (CalendarDay | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = localDateISO(new Date(year, month, day));
      cells.push({ date, day, slugs: byDay.get(date) ?? [] });
    }
    // Trailing pad, so every week row holds seven cells.
    while (cells.length % 7 !== 0) cells.push(null);
    return { key, year, month, cells };
  });
};
