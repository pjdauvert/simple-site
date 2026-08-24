import { describe, it, expect } from 'vitest';
import type { EventsConfig } from '@simple-site/interfaces';
import {
  buildDesign,
  fromAgendaDraft,
  fromEventPageDraft,
  fromTextsDraft,
  toAgendaDraft,
  toEventPageDraft,
  toTextsDraft,
} from './eventsDesign';

describe('agenda design draft', () => {
  it('resolves defaults for an absent design and persists nothing when pristine', () => {
    const pristine = toAgendaDraft(undefined);
    expect(pristine).toEqual({
      pastEventsMode: 'all',
      pastEventsFromDate: '',
      cardAspectRatio: 'A4',
      columns: 3,
      showLocationOnCards: true,
      showFeaturedBackdrop: true,
    });
    expect(fromAgendaDraft(pristine)).toBeUndefined();
    expect(fromEventPageDraft(toEventPageDraft(undefined))).toBeUndefined();
    expect(buildDesign(pristine, toEventPageDraft(undefined))).toBeUndefined();
  });

  it('stores only deviations from the defaults', () => {
    const stored = fromAgendaDraft({
      pastEventsMode: 'none',
      pastEventsFromDate: '',
      cardAspectRatio: '16:9', // deviates from the A4 default → stored
      columns: 2,
      showLocationOnCards: false,
      showFeaturedBackdrop: false,
    });
    expect(stored).toEqual({
      pastEventsMode: 'none',
      cardAspectRatio: '16:9',
      columns: 2,
      showLocationOnCards: false,
      showFeaturedBackdrop: false,
    });
  });

  it('keeps the from-date whatever the mode — switching away never loses it', () => {
    const events = {
      events: [],
      design: { agendaPage: { pastEventsMode: 'from', pastEventsFromDate: '2026-01-01' } },
    } as unknown as EventsConfig;
    const draft = toAgendaDraft(events);
    expect(draft.pastEventsFromDate).toBe('2026-01-01');
    // The admin flips to "all": the mode deviation disappears, the date stays.
    expect(fromAgendaDraft({ ...draft, pastEventsMode: 'all' })).toEqual({ pastEventsFromDate: '2026-01-01' });
  });
});

describe('section texts draft', () => {
  it('maps stored texts to the form and back, trimming and dropping empties', () => {
    const events = { events: [], nextHeader: 'À ne pas *manquer*.', pastHeader: 'Nos *souvenirs*.' } as unknown as EventsConfig;
    const draft = toTextsDraft(events);
    expect(draft.nextHeader).toBe('À ne pas *manquer*.');
    expect(draft.upcomingTitle).toBe('');
    expect(fromTextsDraft({ ...draft, upcomingTitle: '  ', pastTitle: ' Archives ' })).toEqual({
      nextHeader: 'À ne pas *manquer*.',
      pastTitle: 'Archives',
      pastHeader: 'Nos *souvenirs*.',
    });
  });
});
