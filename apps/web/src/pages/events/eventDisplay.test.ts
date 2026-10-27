import { describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material/styles';
import type { EventsConfig, SiteConfig } from '@simple-site/interfaces';
import {
  aspectRatioCss,
  aspectRatioParts,
  eventBackdropLayerSx,
  eventCardImageSrcSet,
  eventCardImageUrl,
  eventCardSizes,
  eventColumnsSx,
  eventContrastPanelSx,
  eventPageImageFrameSx,
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
      showFeaturedBackdrop: true,
      weekStartsOn: 'monday',
    });
    // Both surfaces default to the A4 poster; the full background is opt-in.
    expect(resolveEventPageDesign(undefined)).toEqual({
      imageAspectRatio: 'A4',
      imagePlacement: 'above',
      fullBackgroundImage: false,
    });
  });

  it('honours stored deviations', () => {
    const events = {
      events: [],
      design: {
        agendaPage: { pastEventsMode: 'from', pastEventsFromDate: '2026-01-01', columns: 2, showLocationOnCards: false, showFeaturedBackdrop: false },
        eventPage: { imageAspectRatio: '4:3', imagePlacement: 'beside', fullBackgroundImage: true },
      },
    } as unknown as EventsConfig;
    expect(resolveAgendaDesign(events)).toMatchObject({
      pastEventsMode: 'from',
      pastEventsFromDate: '2026-01-01',
      cardAspectRatio: 'A4', // untouched → default
      columns: 2,
      showLocationOnCards: false,
      showFeaturedBackdrop: false,
    });
    expect(resolveEventPageDesign(events)).toEqual({
      imageAspectRatio: '4:3',
      imagePlacement: 'beside',
      fullBackgroundImage: true,
    });
  });
});

describe('detail-page illustration frame (half-screen cap)', () => {
  it('states the ratio as CSS and as its two parts', () => {
    expect(aspectRatioParts('A4')).toEqual([210, 297]); // the print poster
    expect(aspectRatioParts('16:9')).toEqual([16, 9]);
    expect(aspectRatioCss('A4')).toBe('210 / 297');
    expect(aspectRatioCss('4:3')).toBe('4 / 3');
  });

  it('caps the illustration above the texts at half the screen HEIGHT', () => {
    // A frame filling its width derives its height from the ratio, so half the
    // height is a max-width of `50vh × ratio`.
    expect(eventPageImageFrameSx('A4', 'above')).toEqual({
      aspectRatio: '210 / 297',
      width: '100%',
      maxWidth: 'calc(50vh * 210 / 297)',
      mx: 'auto',
    });
    expect(eventPageImageFrameSx('16:9', 'above')).toMatchObject({
      maxWidth: 'calc(50vh * 16 / 9)',
    });
  });

  it('caps the illustration beside the texts at half the screen WIDTH, by height while stacked', () => {
    expect(eventPageImageFrameSx('A4', 'beside')).toEqual({
      aspectRatio: '210 / 297',
      width: '100%',
      // Below `md` the layout stacks — that is the `above` situation.
      maxWidth: { xs: 'calc(50vh * 210 / 297)', md: '50vw' },
      mx: 'auto',
    });
  });
});

describe('blurred backdrop treatment (featured block + full-background event page)', () => {
  const theme = createTheme();

  it('covers the surface with a cheap blurred rendition of the illustration', () => {
    const layer = eventBackdropLayerSx(theme, 'https://ik.imagekit.io/demo/poster.jpg');
    expect(layer).toMatchObject({
      position: 'absolute',
      inset: 0,
      backgroundSize: 'cover',
      filter: 'blur(24px)',
      // Scaled past its own edges, so the blur never shows a fringe.
      transform: 'scale(1.15)',
    });
    // A deliberately tiny rendition — the blur erases any detail.
    expect(layer.backgroundImage).toBe('url("https://ik.imagekit.io/demo/poster.jpg?tr=w-480,q-50,f-auto")');
  });

  it('falls back to the brand gradient without an illustration', () => {
    const layer = eventBackdropLayerSx(theme, undefined);
    expect(layer.backgroundImage).toBeUndefined();
    expect(layer.background).toContain('linear-gradient');
  });

  it('keeps the text panel opaque enough to stay readable over any artwork', () => {
    const panel = eventContrastPanelSx(theme);
    expect(panel).toMatchObject({ backdropFilter: 'blur(8px)' });
    // 85 % of `background.paper` — the contrast the review settled on.
    expect(panel.bgcolor).toContain('0.85');
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

  it('ships a responsive srcSet with a column-derived sizes hint', () => {
    expect(eventCardImageSrcSet('https://ik.imagekit.io/demo/shot.jpg')).toContain('w-320,q-80,f-auto 320w');
    expect(eventCardImageSrcSet('/local/raw.jpg')).toBeUndefined();
    expect(eventCardSizes(4)).toBe('(min-width: 900px) 25vw, (min-width: 600px) 50vw, 100vw');
  });
});

describe('eventColumnsSx', () => {
  it('stacks on phones, pairs on tablets, honours the design count on desktop only', () => {
    expect(eventColumnsSx(4)).toEqual({ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' });
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
