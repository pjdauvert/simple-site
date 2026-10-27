import { describe, it, expect } from 'vitest';
import { EventsConfigSchema, type EventsConfig } from '@simple-site/interfaces';
import {
  aspectLabelKey,
  fromAgendaDraft,
  fromEventPageDraft,
  fromTextsDraft,
  mergeAgendaDraft,
  mergeEventPageDraft,
  toAgendaDraft,
  toEventPageDraft,
  toTextsDraft,
} from './eventsDesign';

const festival = {
  slug: 'summer-festival',
  name: 'Summer Festival',
  startDateTime: '2027-06-18T15:00:00.000Z',
  location: 'Bordeaux',
};

const config = (events: Partial<EventsConfig>): EventsConfig =>
  EventsConfigSchema.parse({ events: [festival], ...events });

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
      weekStartsOn: 'monday',
    });
    expect(fromAgendaDraft(pristine)).toBeUndefined();
  });

  it('stores only deviations from the defaults', () => {
    expect(
      fromAgendaDraft({
        pastEventsMode: 'none',
        pastEventsFromDate: '',
        cardAspectRatio: '16:9', // deviates from the A4 default → stored
        columns: 2,
        showLocationOnCards: false,
        showFeaturedBackdrop: false,
        weekStartsOn: 'sunday',
      }),
    ).toEqual({
      pastEventsMode: 'none',
      cardAspectRatio: '16:9',
      columns: 2,
      showLocationOnCards: false,
      showFeaturedBackdrop: false,
      weekStartsOn: 'sunday',
    });
  });

  it('stores the week start only when it leaves Monday', () => {
    const draft = toAgendaDraft(undefined);
    expect(draft.weekStartsOn).toBe('monday');
    expect(fromAgendaDraft({ ...draft, weekStartsOn: 'sunday' })).toEqual({ weekStartsOn: 'sunday' });
    expect(fromAgendaDraft({ ...draft, weekStartsOn: 'monday' })).toBeUndefined();
    expect(toAgendaDraft(config({ design: { agendaPage: { weekStartsOn: 'sunday' } } })).weekStartsOn).toBe('sunday');
  });

  it('keeps the from-date whatever the mode — switching away never loses it', () => {
    const stored = config({ design: { agendaPage: { pastEventsMode: 'from', pastEventsFromDate: '2026-01-01' } } });
    const draft = toAgendaDraft(stored);
    expect(draft.pastEventsFromDate).toBe('2026-01-01');
    // The admin flips to "all": the mode deviation disappears, the date stays.
    expect(fromAgendaDraft({ ...draft, pastEventsMode: 'all' })).toEqual({ pastEventsFromDate: '2026-01-01' });
  });
});

describe('event page design draft', () => {
  it('defaults to the A4 poster with no background and persists nothing when pristine', () => {
    const pristine = toEventPageDraft(undefined);
    expect(pristine).toEqual({ imageAspectRatio: 'A4', imagePlacement: 'above', fullBackgroundImage: false });
    expect(fromEventPageDraft(pristine)).toBeUndefined();
  });

  it('stores a ratio deviation alone', () => {
    expect(
      fromEventPageDraft({ imageAspectRatio: '16:9', imagePlacement: 'above', fullBackgroundImage: false }),
    ).toEqual({ imageAspectRatio: '16:9' });
  });

  it('stores the full background as `true` only, A4 staying implicit', () => {
    expect(
      fromEventPageDraft({ imageAspectRatio: 'A4', imagePlacement: 'above', fullBackgroundImage: true }),
    ).toEqual({ fullBackgroundImage: true });
    expect(
      fromEventPageDraft({ imageAspectRatio: '4:3', imagePlacement: 'above', fullBackgroundImage: true }),
    ).toEqual({ imageAspectRatio: '4:3', fullBackgroundImage: true });
  });

  it('stores a placement deviation alone — `above` stays implicit', () => {
    expect(
      fromEventPageDraft({ imageAspectRatio: 'A4', imagePlacement: 'beside', fullBackgroundImage: false }),
    ).toEqual({ imagePlacement: 'beside' });
    expect(
      fromEventPageDraft({ imageAspectRatio: 'A4', imagePlacement: 'above', fullBackgroundImage: false }),
    ).toBeUndefined();
  });

  it('reads a stored event-page design back into the form', () => {
    expect(toEventPageDraft(config({ design: { eventPage: { fullBackgroundImage: true } } }))).toEqual({
      imageAspectRatio: 'A4',
      imagePlacement: 'above',
      fullBackgroundImage: true,
    });
    expect(toEventPageDraft(config({ design: { eventPage: { imagePlacement: 'beside' } } }))).toMatchObject({
      imagePlacement: 'beside',
    });
  });
});

describe('section texts draft', () => {
  it('maps stored texts to the form and back, trimming and dropping empties', () => {
    const draft = toTextsDraft(config({ upcomingHeader: 'À ne pas *manquer*.', pastHeader: 'Nos *souvenirs*.' }));
    expect(draft).toEqual({
      upcomingTitle: '',
      pastTitle: '',
      upcomingHeader: 'À ne pas *manquer*.',
      pastHeader: 'Nos *souvenirs*.',
    });
    expect(fromTextsDraft({ ...draft, upcomingTitle: '  ', pastTitle: ' Archives ' })).toEqual({
      pastTitle: 'Archives',
      upcomingHeader: 'À ne pas *manquer*.',
      pastHeader: 'Nos *souvenirs*.',
    });
  });
});

describe('mergeAgendaDraft (what the Agenda design tab writes)', () => {
  it('keeps the list and the event-page design, and writes its own slice', () => {
    const fresh = config({
      upcomingTitle: 'Bientôt',
      design: { agendaPage: { columns: 4 }, eventPage: { imageAspectRatio: '4:3' } },
    });
    const merged = mergeAgendaDraft(fresh, { ...toAgendaDraft(fresh), columns: 2 }, toTextsDraft(fresh));
    expect(merged).toEqual({
      events: [festival],
      upcomingTitle: 'Bientôt',
      design: { agendaPage: { columns: 2 }, eventPage: { imageAspectRatio: '4:3' } },
    });
  });

  it('DROPS a text the admin cleared (the texts are rewritten, never merged)', () => {
    const fresh = config({ upcomingTitle: 'Bientôt', pastHeader: 'Nos souvenirs.' });
    const merged = mergeAgendaDraft(fresh, toAgendaDraft(fresh), { ...toTextsDraft(fresh), upcomingTitle: '' });
    expect(merged.upcomingTitle).toBeUndefined();
    expect(merged.pastHeader).toBe('Nos souvenirs.');
  });

  it('drops the design block entirely when both surfaces are pristine', () => {
    const fresh = config({ design: { agendaPage: { columns: 2 } } });
    const merged = mergeAgendaDraft(fresh, toAgendaDraft(undefined), toTextsDraft(undefined));
    expect(merged).toEqual({ events: [festival] });
  });

  it('writes over an absent events attribute', () => {
    expect(mergeAgendaDraft(undefined, toAgendaDraft(undefined), toTextsDraft(undefined))).toEqual({ events: [] });
  });
});

describe('mergeEventPageDraft (what the Event page design tab writes)', () => {
  it('keeps the list, the texts and the agenda design, and writes its own slice', () => {
    const fresh = config({ pastTitle: 'Archives', design: { agendaPage: { columns: 2 } } });
    const draft = { imageAspectRatio: 'A4', imagePlacement: 'above', fullBackgroundImage: true } as const;
    expect(mergeEventPageDraft(fresh, draft)).toEqual({
      events: [festival],
      pastTitle: 'Archives',
      design: { agendaPage: { columns: 2 }, eventPage: { fullBackgroundImage: true } },
    });
  });

  it('drops its own stored slice when the tab goes back to the defaults', () => {
    const fresh = config({ design: { eventPage: { imageAspectRatio: '1:1', fullBackgroundImage: true } } });
    expect(mergeEventPageDraft(fresh, toEventPageDraft(undefined))).toEqual({ events: [festival] });
  });

  it('keeps the agenda design when its own slice empties out', () => {
    const fresh = config({ design: { agendaPage: { showFeaturedBackdrop: false }, eventPage: { imageAspectRatio: '1:1' } } });
    expect(mergeEventPageDraft(fresh, toEventPageDraft(undefined))).toEqual({
      events: [festival],
      design: { agendaPage: { showFeaturedBackdrop: false } },
    });
  });
});

describe('aspectLabelKey', () => {
  it('maps every ratio to its label key, `:` becoming `_`', () => {
    expect(aspectLabelKey('A4')).toBe('page.manage.events.design.aspect.A4');
    expect(aspectLabelKey('16:9')).toBe('page.manage.events.design.aspect.16_9');
  });
});
