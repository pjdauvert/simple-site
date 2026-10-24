import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EVENT_SORT,
  EVENT_SORT_CRITERIA,
  filterEvents,
  matchesEventSearch,
  normalizeForSearch,
  sortEvents,
  type SearchableEvent,
} from './eventsSearch';

/** A searchable event — only the fields the helpers read. */
const event = (name: string, description?: string, startDateTime = '2026-05-01T10:00:00.000Z'): SearchableEvent => ({
  name,
  startDateTime,
  ...(description === undefined ? {} : { description }),
});

describe('normalizeForSearch', () => {
  it('drops diacritics and lowercases', () => {
    expect(normalizeForSearch('Régate du Printemps')).toBe('regate du printemps');
    expect(normalizeForSearch('ÈÉÊË')).toBe('eeee');
  });

  it('removes inline markdown so formatting never splits a word', () => {
    expect(normalizeForSearch('**Régate**')).toBe('regate');
    expect(normalizeForSearch('Ré**gate**')).toBe('regate');
    expect(normalizeForSearch('`code` ~~gone~~ #Titre')).toBe('code gone titre');
    expect(normalizeForSearch('> quoted')).toBe('quoted');
  });

  it('keeps a link label and drops its target', () => {
    expect(normalizeForSearch('[Régate](https://example.com/regate)')).toBe('regate');
    expect(normalizeForSearch('![Affiche](/img/a.png)')).toBe('affiche');
  });

  it('keeps underscores as word separators (snake_case stays searchable)', () => {
    expect(normalizeForSearch('spring_regatta')).toBe('spring_regatta');
  });

  it('collapses whitespace', () => {
    expect(normalizeForSearch('  Régate \n  du   Printemps  ')).toBe('regate du printemps');
  });
});

describe('matchesEventSearch', () => {
  const regatta = event('Régate du Printemps', 'Une **régate** ouverte à tous, [détails](https://x.test/d).');

  it('ignores accents in the stored text', () => {
    expect(matchesEventSearch(regatta, 'regate')).toBe(true);
  });

  it('ignores accents in the typed query', () => {
    expect(matchesEventSearch(event('Regate du Printemps'), 'régate')).toBe(true);
    expect(matchesEventSearch(event('Régate du Printemps'), 'rêgate')).toBe(true);
  });

  it('ignores case', () => {
    expect(matchesEventSearch(regatta, 'PRINTEMPS')).toBe(true);
    expect(matchesEventSearch(event('fête de la voile'), 'Fete')).toBe(true);
  });

  it('matches a word start inside the text, not only the first word', () => {
    expect(matchesEventSearch(regatta, 'print')).toBe(true);
  });

  it('matches at word starts ONLY — never inside a word', () => {
    expect(matchesEventSearch(event('Régate'), 'gate')).toBe(false);
    expect(matchesEventSearch(event('Printemps'), 'temps')).toBe(false);
  });

  it('is not fooled by markdown formatting around the word', () => {
    for (const description of [
      'Une **Régate** de printemps',
      'Une _régate_ de printemps',
      'Une [Régate](https://x.test/regate) de printemps',
      '#Régate de printemps',
      'Une ~~Régate~~ de printemps',
      'Une `régate` de printemps',
      'Une Ré**gate** de printemps',
    ]) {
      expect(matchesEventSearch(event('Sans titre', description), 'regate')).toBe(true);
    }
  });

  it('scans the description as well as the name', () => {
    expect(matchesEventSearch(event('Summer Festival', 'Place de la Bourse'), 'bourse')).toBe(true);
    expect(matchesEventSearch(event('Summer Festival'), 'bourse')).toBe(false);
  });

  it('treats regex metacharacters as literal text', () => {
    expect(matchesEventSearch(event('Festival (2026)'), '(2026')).toBe(true);
    expect(matchesEventSearch(event('Festival 2026'), '(2026')).toBe(false);
    expect(matchesEventSearch(event('Trophée C++'), 'c++')).toBe(true);
    // A metacharacter-only query compiles without throwing.
    expect(() => matchesEventSearch(event('Régate'), '.')).not.toThrow();
    expect(() => matchesEventSearch(event('Régate'), '[a-z]')).not.toThrow();
    expect(() => matchesEventSearch(event('Régate'), 'rég(')).not.toThrow();
    expect(matchesEventSearch(event('Régate'), 'rég(')).toBe(false);
  });

  it('requires every token of a multi-word query to match some word start', () => {
    expect(matchesEventSearch(regatta, 'reg print')).toBe(true);
    expect(matchesEventSearch(regatta, 'print reg')).toBe(true); // order-free
    expect(matchesEventSearch(regatta, 'reg zzz')).toBe(false);
    expect(matchesEventSearch(regatta, 'reg emps')).toBe(false); // "emps" is not a word start
  });

  it('matches everything on an empty or formatting-only query', () => {
    expect(matchesEventSearch(event('Régate'), '')).toBe(true);
    expect(matchesEventSearch(event('Régate'), '   ')).toBe(true);
    expect(matchesEventSearch(event('Régate'), '**')).toBe(true);
  });

  it('handles an event without a description', () => {
    expect(matchesEventSearch(event('Régate'), 'reg')).toBe(true);
  });
});

describe('filterEvents', () => {
  const events = [
    event('Régate du Printemps', 'Quai des Chartrons'),
    event('Summer Festival', 'Place de la **Bourse**'),
    event('Regatta Night'),
  ];

  it('keeps the matching events in their input order', () => {
    expect(filterEvents(events, 'reg').map((e) => e.name)).toEqual(['Régate du Printemps', 'Regatta Night']);
    expect(filterEvents(events, 'bourse').map((e) => e.name)).toEqual(['Summer Festival']);
    expect(filterEvents(events, 'zzz')).toEqual([]);
  });

  it('returns a copy of the whole list on an empty query', () => {
    const all = filterEvents(events, '');
    expect(all).toEqual(events);
    expect(all).not.toBe(events);
  });

  it('never mutates its input', () => {
    const snapshot = JSON.stringify(events);
    filterEvents(events, 'regate');
    expect(JSON.stringify(events)).toBe(snapshot);
  });

  it('carries the caller row data through (the list tab tags rows with their index)', () => {
    const rows = [{ ...event('Régate'), index: 7 }];
    expect(filterEvents(rows, 'reg')[0].index).toBe(7);
  });
});

describe('sortEvents', () => {
  const past = event('Spring Regatta', undefined, '2024-04-01T08:00:00.000Z');
  const soon = event('alpha Market', undefined, '2026-06-01T08:00:00.000Z');
  const later = event('Beta Festival', undefined, '2027-01-01T08:00:00.000Z');
  const events = [soon, past, later];

  it('defaults to start date descending', () => {
    expect(DEFAULT_EVENT_SORT).toBe('startDesc');
    expect(sortEvents(events, DEFAULT_EVENT_SORT).map((e) => e.name)).toEqual([
      'Beta Festival',
      'alpha Market',
      'Spring Regatta',
    ]);
  });

  it('sorts by start date ascending', () => {
    expect(sortEvents(events, 'startAsc').map((e) => e.name)).toEqual([
      'Spring Regatta',
      'alpha Market',
      'Beta Festival',
    ]);
  });

  it('sorts names case-tolerantly (a lexicographic compare would not)', () => {
    expect(sortEvents(events, 'nameAsc').map((e) => e.name)).toEqual([
      'alpha Market',
      'Beta Festival',
      'Spring Regatta',
    ]);
    expect(sortEvents(events, 'nameDesc').map((e) => e.name)).toEqual([
      'Spring Regatta',
      'Beta Festival',
      'alpha Market',
    ]);
  });

  it('sorts names accent-tolerantly in the reader locale', () => {
    const accented = [event('Étoile'), event('Avion'), event('zèbre'), event('Église')];
    expect(sortEvents(accented, 'nameAsc', 'fr').map((e) => e.name)).toEqual([
      'Avion',
      'Église',
      'Étoile',
      'zèbre',
    ]);
  });

  it('orders numbered names the way a reader counts', () => {
    const numbered = [event('Régate 10'), event('Régate 2')];
    expect(sortEvents(numbered, 'nameAsc').map((e) => e.name)).toEqual(['Régate 2', 'Régate 10']);
  });

  it('reads a missing start date as the epoch (incomplete rows sink under the default sort)', () => {
    const undated = event('Draft event', undefined, '');
    expect(sortEvents([undated, soon], 'startDesc').map((e) => e.name)).toEqual(['alpha Market', 'Draft event']);
    expect(sortEvents([soon, undated], 'startAsc').map((e) => e.name)).toEqual(['Draft event', 'alpha Market']);
  });

  it('returns a copy and never mutates its input', () => {
    const sorted = sortEvents(events, 'nameAsc');
    expect(sorted).not.toBe(events);
    expect(events.map((e) => e.name)).toEqual(['alpha Market', 'Spring Regatta', 'Beta Festival']);
  });

  it('exposes every criterion the selector offers', () => {
    expect([...EVENT_SORT_CRITERIA]).toEqual(['startDesc', 'startAsc', 'nameAsc', 'nameDesc']);
  });
});
