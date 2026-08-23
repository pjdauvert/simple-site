import {
  DEFAULT_EVENT_CARD_ASPECT_RATIO,
  DEFAULT_EVENT_COLUMNS,
  DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
  DEFAULT_EVENT_SHOW_FEATURED_BACKDROP,
  DEFAULT_EVENT_SHOW_LOCATION_ON_CARDS,
  DEFAULT_PAST_EVENTS_MODE,
  type EventsAgendaDesign,
  type EventsConfig,
  type EventsPageDesign,
} from '@simple-site/interfaces';
import {
  resolveAgendaDesign,
  resolveEventPageDesign,
  type ResolvedAgendaDesign,
  type ResolvedEventPageDesign,
} from '../../../pages/events/eventDisplay';

/**
 * Pure draft ↔ stored converters of the events Design tab. Drafts carry every
 * option RESOLVED (defaults filled in) so the form is fully controlled — the
 * resolution itself is the public pages' (`resolveAgendaDesign`), so admin and
 * rendering can never disagree on a default; the `from*` converters keep only
 * deviations from the defaults, so a pristine tab persists nothing
 * (`undefined`).
 */

export interface AgendaDesignDraft extends Omit<ResolvedAgendaDesign, 'pastEventsFromDate'> {
  /** Kept whatever the mode — switching away and back never loses the date ('' ↔ absent). */
  pastEventsFromDate: string;
}

export type EventPageDesignDraft = ResolvedEventPageDesign;

/** The agenda sections' editable texts ('' ↔ absent) — the featured section only has an intro. */
export interface SectionTextsDraft {
  upcomingTitle: string;
  pastTitle: string;
  nextHeader: string;
  upcomingHeader: string;
  pastHeader: string;
}

export const toAgendaDraft = (events: EventsConfig | undefined): AgendaDesignDraft => {
  const resolved = resolveAgendaDesign(events);
  return { ...resolved, pastEventsFromDate: resolved.pastEventsFromDate ?? '' };
};

export const fromAgendaDraft = (draft: AgendaDesignDraft): EventsAgendaDesign | undefined => {
  const design: EventsAgendaDesign = {};
  if (draft.pastEventsMode !== DEFAULT_PAST_EVENTS_MODE) design.pastEventsMode = draft.pastEventsMode;
  if (draft.pastEventsFromDate) design.pastEventsFromDate = draft.pastEventsFromDate;
  if (draft.cardAspectRatio !== DEFAULT_EVENT_CARD_ASPECT_RATIO) design.cardAspectRatio = draft.cardAspectRatio;
  if (draft.columns !== DEFAULT_EVENT_COLUMNS) design.columns = draft.columns;
  if (draft.showLocationOnCards !== DEFAULT_EVENT_SHOW_LOCATION_ON_CARDS) design.showLocationOnCards = false;
  if (draft.showFeaturedBackdrop !== DEFAULT_EVENT_SHOW_FEATURED_BACKDROP) design.showFeaturedBackdrop = false;
  return Object.keys(design).length > 0 ? design : undefined;
};

export const toEventPageDraft = (events: EventsConfig | undefined): EventPageDesignDraft =>
  resolveEventPageDesign(events);

export const fromEventPageDraft = (draft: EventPageDesignDraft): EventsPageDesign | undefined =>
  draft.imageAspectRatio !== DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO
    ? { imageAspectRatio: draft.imageAspectRatio }
    : undefined;

/** The stored `design` block, or undefined when both surfaces are pristine. */
export const buildDesign = (
  agenda: AgendaDesignDraft,
  eventPage: EventPageDesignDraft,
): EventsConfig['design'] => {
  const agendaPage = fromAgendaDraft(agenda);
  const page = fromEventPageDraft(eventPage);
  if (!agendaPage && !page) return undefined;
  return { ...(agendaPage ? { agendaPage } : {}), ...(page ? { eventPage: page } : {}) };
};

export const toTextsDraft = (events: EventsConfig | undefined): SectionTextsDraft => ({
  upcomingTitle: events?.upcomingTitle ?? '',
  pastTitle: events?.pastTitle ?? '',
  nextHeader: events?.nextHeader ?? '',
  upcomingHeader: events?.upcomingHeader ?? '',
  pastHeader: events?.pastHeader ?? '',
});

/** The stored shape of the texts: trimmed, empty ones dropped entirely. */
export const fromTextsDraft = (draft: SectionTextsDraft): Partial<EventsConfig> => {
  const entries = (Object.entries(draft) as [keyof SectionTextsDraft, string][])
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0);
  return Object.fromEntries(entries) as Partial<EventsConfig>;
};
