import { describe, it, expect } from 'vitest';
import type { EventsConfig, SiteConfig } from '@simple-site/interfaces';
import {
  aspectRatioCss,
  eventCardImageUrl,
  eventRoute,
  eventsPageTitle,
  googleMapsSearchUrl,
  resolveAgendaDesign,
  resolveEventPageDesign,
} from './eventDisplay';

describe('design resolution (stored deviations over defaults)', () => {
  it('resolves the documented defaults when nothing is stored', () => {
    expect(resolveAgendaDesign(undefined)).toEqual({
      pastEventsMode: 'all',
      pastEventsFromDate: undefined,
      cardAspectRatio: 'A4',
      columns: 3,
      showLocationOnCards: true,
    });
    expect(resolveEventPageDesign(undefined)).toEqual({ imageAspectRatio: '16:9' });
  });

  it('honours stored deviations', () => {
    const events = {
      events: [],
      design: {
        agendaPage: { pastEventsMode: 'from', pastEventsFromDate: '2026-01-01', columns: 2, showLocationOnCards: false },
        eventPage: { imageAspectRatio: '4:3' },
      },
    } as unknown as EventsConfig;
    expect(resolveAgendaDesign(events)).toMatchObject({
      pastEventsMode: 'from',
      pastEventsFromDate: '2026-01-01',
      cardAspectRatio: 'A4', // untouched → default
      columns: 2,
      showLocationOnCards: false,
    });
    expect(resolveEventPageDesign(events)).toEqual({ imageAspectRatio: '4:3' });
  });
});

describe('URL helpers', () => {
  it('builds the event route under the reserved feature route', () => {
    expect(eventRoute('fete-du-port')).toBe('/events/fete-du-port');
  });

  it('builds an encoded Google Maps search on the address', () => {
    expect(googleMapsSearchUrl('12 quai des Chartrons, Bordeaux')).toBe(
      'https://www.google.com/maps/search/?api=1&query=12%20quai%20des%20Chartrons%2C%20Bordeaux',
    );
  });

  it('maps ratios to CSS aspect-ratio values — A4 is the portrait poster', () => {
    expect(aspectRatioCss('16:9')).toBe('16 / 9');
    expect(aspectRatioCss('1:1')).toBe('1 / 1');
    expect(aspectRatioCss('A4')).toBe('210 / 297');
  });

  it('right-sizes ImageKit URLs and leaves other URLs untouched', () => {
    expect(eventCardImageUrl('https://ik.imagekit.io/demo/shot.jpg')).toBe(
      'https://ik.imagekit.io/demo/shot.jpg?tr=w-640,q-80,f-auto',
    );
    expect(eventCardImageUrl('/local/raw.jpg')).toBe('/local/raw.jpg');
  });
});

describe('eventsPageTitle', () => {
  const config = (menu?: unknown): SiteConfig =>
    ({ site: { siteName: 'S' }, themes: [], pages: [], menu }) as unknown as SiteConfig;

  it('prefers the menu entry custom label, wherever the entry sits', () => {
    expect(
      eventsPageTitle(config({ entries: [{ type: 'feature', feature: 'events', visible: true, menuTitle: 'Agenda' }] })),
    ).toBe('Agenda');
    expect(
      eventsPageTitle(
        config({
          entries: [
            {
              type: 'group',
              groupId: 'more',
              menuTitle: 'More',
              visible: true,
              children: [{ type: 'feature', feature: 'events', visible: true, menuTitle: 'Agenda' }],
            },
          ],
        }),
      ),
    ).toBe('Agenda');
  });

  it('falls back to the feature default without a menu or custom label', () => {
    expect(eventsPageTitle(config())).toBe('Events');
    expect(eventsPageTitle(config({ entries: [{ type: 'feature', feature: 'events', visible: true }] }))).toBe('Events');
  });
});
