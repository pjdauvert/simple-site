import { describe, it, expect } from 'vitest';
import type { SiteConfig } from '@simple-site/interfaces';
import {
  EventsConfigSchema,
  I18nDictionarySchema,
  SiteEventSchema,
  StoredSiteConfigSchema,
  collectEventsI18nEntries,
  collectI18nEntries,
  eventDescriptionKey,
  eventLocationKey,
  eventNameKey,
  EVENTS_NEXT_TITLE_KEY,
  EVENTS_PAST_HEADER_KEY,
} from '@simple-site/interfaces';

const validEvent = {
  slug: 'fete-du-port',
  name: 'Fête du port',
  startDateTime: '2026-09-12T17:00:00.000Z',
  location: '12 quai des Chartrons, Bordeaux',
};

describe('SiteEventSchema', () => {
  it('accepts a minimal UTC event', () => {
    expect(SiteEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('accepts an end at or after the start', () => {
    expect(
      SiteEventSchema.safeParse({ ...validEvent, endDateTime: '2026-09-12T17:00:00.000Z' }).success,
    ).toBe(true);
    expect(
      SiteEventSchema.safeParse({ ...validEvent, endDateTime: '2026-09-14T10:00:00.000Z' }).success,
    ).toBe(true);
  });

  it('rejects an end before the start', () => {
    expect(
      SiteEventSchema.safeParse({ ...validEvent, endDateTime: '2026-09-12T16:59:59.000Z' }).success,
    ).toBe(false);
  });

  it('only accepts canonical UTC instants (no offset, no local, no date-only)', () => {
    expect(SiteEventSchema.safeParse({ ...validEvent, startDateTime: '2026-09-12T17:00:00+02:00' }).success).toBe(false);
    expect(SiteEventSchema.safeParse({ ...validEvent, startDateTime: '2026-09-12T17:00:00' }).success).toBe(false);
    expect(SiteEventSchema.safeParse({ ...validEvent, startDateTime: '2026-09-12' }).success).toBe(false);
  });

  it('enforces the kebab-case slug charset', () => {
    for (const slug of ['Fete', 'fete_du_port', '-fete', 'fete-', 'fête']) {
      expect(SiteEventSchema.safeParse({ ...validEvent, slug }).success).toBe(false);
    }
  });
});

describe('EventsConfigSchema', () => {
  it('defaults the list and rejects duplicate slugs', () => {
    expect(EventsConfigSchema.parse({}).events).toEqual([]);
    const result = EventsConfigSchema.safeParse({ events: [validEvent, { ...validEvent, name: 'Bis' }] });
    expect(result.success).toBe(false);
  });

  it('bounds the design options', () => {
    const design = (agendaPage: object) => ({ events: [], design: { agendaPage } });
    expect(EventsConfigSchema.safeParse(design({ columns: 3 })).success).toBe(true);
    expect(EventsConfigSchema.safeParse(design({ columns: 5 })).success).toBe(false);
    expect(EventsConfigSchema.safeParse(design({ pastEventsMode: 'from', pastEventsFromDate: '2026-01-01' })).success).toBe(true);
    expect(EventsConfigSchema.safeParse(design({ pastEventsFromDate: '01/01/2026' })).success).toBe(false);
  });
});

describe('site config integration', () => {
  const base = { site: { siteName: 'S', defaultLanguage: 'en' }, themes: [], pages: [] };

  it('round-trips a stored config with and without an events block', () => {
    expect(StoredSiteConfigSchema.safeParse(base).success).toBe(true);
    const withEvents = StoredSiteConfigSchema.safeParse({ ...base, events: { events: [validEvent] } });
    expect(withEvents.success).toBe(true);
  });

  it('collectI18nEntries emits the feature label for an events menu entry', () => {
    const config = {
      ...base,
      menu: { entries: [{ type: 'feature', feature: 'events', visible: true }] },
    } as unknown as SiteConfig;
    const map = new Map(collectI18nEntries(config).map((e) => [e.key, e.defaultValue]));
    expect(map.get('events.menuTitle')).toBe('Events');
  });
});

describe('collectEventsI18nEntries', () => {
  it('emits slug-scoped keys for every event, skipping absent descriptions', () => {
    const entries = collectEventsI18nEntries(
      EventsConfigSchema.parse({ events: [validEvent, { ...validEvent, slug: 'regate', name: 'Régate', description: 'Une **régate**.' }] }),
    );
    const map = new Map(entries.map((e) => [e.key, e.defaultValue]));
    expect(map.get(eventNameKey('fete-du-port'))).toBe('Fête du port');
    expect(map.get(eventLocationKey('fete-du-port'))).toBe('12 quai des Chartrons, Bordeaux');
    expect(map.has(eventDescriptionKey('fete-du-port'))).toBe(false);
    expect(map.get(eventDescriptionKey('regate'))).toBe('Une **régate**.');
  });

  it('emits section titles and headers only when non-empty', () => {
    const entries = collectEventsI18nEntries(
      EventsConfigSchema.parse({ events: [], nextTitle: 'Prochainement', pastHeader: 'Nos *souvenirs*.', upcomingTitle: '  ' }),
    );
    const keys = entries.map((e) => e.key);
    expect(keys).toContain(EVENTS_NEXT_TITLE_KEY);
    expect(keys).toContain(EVENTS_PAST_HEADER_KEY);
    expect(keys).toHaveLength(2);
  });

  it('produces keys the translation dictionary accepts (hyphenated slugs)', () => {
    expect(I18nDictionarySchema.safeParse({ [eventNameKey('fete-du-port')]: 'Harbour festival' }).success).toBe(true);
  });
});
