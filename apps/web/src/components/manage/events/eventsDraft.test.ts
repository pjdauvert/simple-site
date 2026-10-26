import dayjs from 'dayjs';
import { describe, it, expect } from 'vitest';
import {
  applyWhen,
  buildWhen,
  createEvent,
  eventsAreValid,
  normalizeEvent,
  readWhen,
  sortForEditor,
  validateEvents,
  type EventDraft,
} from './eventsDraft';

const draft = (over: Partial<EventDraft> = {}): EventDraft => ({
  slug: 'summer-festival',
  name: 'Summer Festival',
  startDateTime: '2027-06-18T15:00:00.000Z',
  location: 'Place de la Bourse',
  ...over,
});

/**
 * The suite runs on a pinned non-UTC timezone (`TZ=Europe/Paris`, see
 * `vitest.config.ts`), so every expectation below is written with the offset
 * spelled out: June is CEST (UTC+2), January CET (UTC+1). A local/UTC mix-up
 * therefore cannot pass.
 */
describe('local day/time fields ↔ stored UTC instants', () => {
  it('stores a local wall-clock entry as the matching UTC instant (round trip)', () => {
    const built = buildWhen({
      startDay: dayjs('2027-06-18'),
      startTime: dayjs('2027-06-18T19:30'),
      endDay: null,
      endTime: null,
      multiDay: false,
    });
    // 19:30 in Paris on a summer day is 17:30 UTC — not 19:30 UTC.
    expect(built).toEqual({ startDateTime: '2027-06-18T17:30:00.000Z' });

    const fields = readWhen({ ...draft(), ...built });
    expect(fields.startDay?.format('YYYY-MM-DD')).toBe('2027-06-18');
    expect(fields.startTime?.format('HH:mm')).toBe('19:30');
    expect(fields.multiDay).toBe(false);
    expect(fields.endDay).toBeNull();
    expect(fields.endTime).toBeNull();
  });

  it('follows the admin offset of the entered day, not a fixed one', () => {
    expect(
      buildWhen({
        startDay: dayjs('2027-01-15'),
        startTime: dayjs('2027-01-15T19:30'),
        endDay: null,
        endTime: null,
        multiDay: false,
      }).startDateTime,
    ).toBe('2027-01-15T18:30:00.000Z');
  });

  it('reads the LOCAL calendar day, not the UTC one', () => {
    // 23:30 UTC is already the next day in Paris.
    const fields = readWhen(draft({ startDateTime: '2027-06-18T23:30:00.000Z' }));
    expect(fields.startDay?.format('YYYY-MM-DD')).toBe('2027-06-19');
    expect(fields.startTime?.format('HH:mm')).toBe('01:30');
  });

  it('keeps times for an end on the same local day', () => {
    const fields = readWhen(
      draft({ startDateTime: '2027-06-18T17:30:00.000Z', endDateTime: '2027-06-18T21:00:00.000Z' }),
    );
    expect(fields.multiDay).toBe(false);
    expect(fields.endDay?.format('YYYY-MM-DD')).toBe('2027-06-18');
    expect(fields.endTime?.format('HH:mm')).toBe('23:00');
  });

  it('hides the times of an event spanning several local days', () => {
    const fields = readWhen(
      draft({ startDateTime: '2027-06-18T22:00:00.000Z', endDateTime: '2027-06-20T21:59:00.000Z' }),
    );
    expect(fields.multiDay).toBe(true);
    expect(fields.startDay?.format('YYYY-MM-DD')).toBe('2027-06-19');
    expect(fields.startTime).toBeNull();
    expect(fields.endDay?.format('YYYY-MM-DD')).toBe('2027-06-20');
    expect(fields.endTime).toBeNull();
  });

  it('treats absent and unparsable values as empty', () => {
    const fields = readWhen(draft({ startDateTime: '', endDateTime: 'not-a-date' }));
    expect(fields).toEqual({ startDay: null, startTime: null, endDay: null, endTime: null, multiDay: false });
    expect(
      buildWhen({ startDay: dayjs('nope'), startTime: dayjs('nope'), endDay: null, endTime: null, multiDay: false }),
    ).toEqual({ startDateTime: '' });
  });
});

describe('applyWhen', () => {
  const single = draft({ startDateTime: '2027-06-18T17:30:00.000Z', endDateTime: '2027-06-18T21:00:00.000Z' });

  it('moves the start day while keeping the entered time of day', () => {
    const next = applyWhen(single, { startDay: dayjs('2027-06-25') });
    expect(next.startDateTime).toBe('2027-06-25T17:30:00.000Z');
  });

  it('keeps the times when the start moves PAST the end (an invalid in-between)', () => {
    // Pushing the start after the end is flagged, never silently rewritten:
    // the admin fixes the end date with their times still in place.
    const next = applyWhen(single, { startDay: dayjs('2027-06-25') });
    expect(next.endDateTime).toBe('2027-06-18T21:00:00.000Z');
    expect(readWhen(next).multiDay).toBe(false);
    expect(readWhen(next).endTime?.format('HH:mm')).toBe('23:00');
    expect(validateEvents([next])[0]?.end).toBe('beforeStart');
  });

  it('replaces the time of day on the same local day', () => {
    const next = applyWhen(single, { startTime: dayjs('2000-01-01T08:05') });
    expect(next.startDateTime).toBe('2027-06-18T06:05:00.000Z');
    expect(next.endDateTime).toBe('2027-06-18T21:00:00.000Z');
  });

  it('spans whole local days — 00:00 to 23:59 — as soon as the end day differs', () => {
    const next = applyWhen(single, { endDay: dayjs('2027-06-20') });
    expect(next.startDateTime).toBe('2027-06-17T22:00:00.000Z'); // 18 June, 00:00 Paris
    expect(next.endDateTime).toBe('2027-06-20T21:59:00.000Z'); // 20 June, 23:59 Paris
    expect(readWhen(next).multiDay).toBe(true);
  });

  it('ends at the local end of the day when the end day is the start day', () => {
    const next = applyWhen(draft({ startDateTime: '2027-06-18T17:30:00.000Z' }), { endDay: dayjs('2027-06-18') });
    expect(next.startDateTime).toBe('2027-06-18T17:30:00.000Z');
    expect(next.endDateTime).toBe('2027-06-18T21:59:00.000Z'); // 23:59 Paris
  });

  it('ends an event on its start day when only an end time is given', () => {
    const next = applyWhen(draft({ startDateTime: '2027-06-18T17:30:00.000Z' }), {
      endTime: dayjs('2000-01-01T23:00'),
    });
    expect(next.endDateTime).toBe('2027-06-18T21:00:00.000Z');
    expect(readWhen(next).multiDay).toBe(false);
  });

  it('clears the end when its day is cleared, and the start when its day is', () => {
    expect(applyWhen(single, { endDay: null, endTime: null }).endDateTime).toBeUndefined();
    expect(applyWhen(single, { startDay: null }).startDateTime).toBe('');
  });

  it('leaves every other field untouched', () => {
    const next = applyWhen({ ...single, persisted: true }, { startDay: dayjs('2027-07-01') });
    expect(next).toMatchObject({ slug: 'summer-festival', name: 'Summer Festival', persisted: true });
  });
});

describe('validateEvents', () => {
  it('accepts a complete event', () => {
    const errors = validateEvents([draft()]);
    expect(eventsAreValid(errors)).toBe(true);
  });

  it('flags every structural problem field by field', () => {
    const errors = validateEvents([
      draft({ name: ' ', slug: '', startDateTime: '', location: ' ', websiteUrl: 'not a url' }),
      draft({ slug: 'Bad_Slug' }),
      draft({ endDateTime: '2027-06-18T14:00:00.000Z' }),
    ]);
    expect(errors[0]).toEqual({ name: 'empty', slug: 'empty', start: 'required', location: 'empty', website: 'invalid' });
    expect(errors[1].slug).toBe('pattern');
    expect(errors[2].end).toBe('beforeStart');
    expect(eventsAreValid(errors)).toBe(false);
  });

  it('flags duplicate slugs across the list', () => {
    const errors = validateEvents([draft(), draft({ name: 'Bis' })]);
    expect(errors[0].slug).toBe('duplicate');
    expect(errors[1].slug).toBe('duplicate');
  });

  it('starts blank from createEvent, with the expected empty-field errors', () => {
    const [errors] = validateEvents([createEvent()]);
    expect(errors).toEqual({ name: 'empty', slug: 'empty', start: 'required', location: 'empty' });
  });

  it('flags a slug the events routes own, before the save is refused', () => {
    const [errors] = validateEvents([
      { slug: 'search', name: 'Search', startDateTime: '2027-06-18T15:00:00.000Z', location: 'Bordeaux' },
    ]);
    expect(errors.slug).toBe('reserved');
  });
});

describe('normalizeEvent', () => {
  it('trims and drops empty optionals along with the editor state', () => {
    const normalized = normalizeEvent(
      draft({ persisted: true, name: '  Fest  ', description: '  ', imageUrl: '', websiteUrl: ' https://x.test ' }),
    );
    expect(normalized).toEqual({
      slug: 'summer-festival',
      name: 'Fest',
      startDateTime: '2027-06-18T15:00:00.000Z',
      location: 'Place de la Bourse',
      websiteUrl: 'https://x.test',
    });
    expect('persisted' in normalized).toBe(false);
  });

  it('drops an end cleared by the date pickers', () => {
    const cleared = applyWhen(draft({ endDateTime: '2027-06-20T21:59:00.000Z' }), { endDay: null, endTime: null });
    expect('endDateTime' in normalizeEvent(cleared)).toBe(false);
  });
});

describe('sortForEditor', () => {
  it('orders by start date descending, tolerating blank drafts', () => {
    const sorted = sortForEditor([
      draft({ slug: 'old', startDateTime: '2025-05-10T08:00:00.000Z' }),
      createEvent(),
      draft({ slug: 'future', startDateTime: '2027-06-18T15:00:00.000Z' }),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(['future', 'old', '']);
  });
});
