import { describe, it, expect } from 'vitest';
import {
  createEvent,
  eventsAreValid,
  localInputToUtc,
  normalizeEvent,
  sortForEditor,
  utcToLocalInput,
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

describe('UTC ↔ datetime-local conversion', () => {
  it('round-trips through the admin timezone', () => {
    const stored = new Date(2027, 5, 18, 19, 30).toISOString();
    const input = utcToLocalInput(stored);
    expect(input).toBe('2027-06-18T19:30');
    expect(localInputToUtc(input)).toBe(stored);
  });

  it('maps empty/invalid to empty (absent)', () => {
    expect(utcToLocalInput(undefined)).toBe('');
    expect(utcToLocalInput('')).toBe('');
    expect(localInputToUtc('')).toBe('');
    expect(localInputToUtc('not-a-date')).toBe('');
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
