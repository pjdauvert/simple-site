import {
  DEFAULT_EVENT_CARD_ASPECT_RATIO,
  DEFAULT_EVENT_COLUMNS,
  DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
  DEFAULT_PAST_EVENTS_MODE,
  type EventAspectRatio,
  type EventsAgendaDesign,
  type EventsConfig,
  type EventsPageDesign,
  type PastEventsMode,
} from '@simple-site/interfaces';

/**
 * Pure draft ↔ stored converters of the events Design tab. Drafts carry every
 * option RESOLVED (defaults filled in) so the form is fully controlled; the
 * `from*` converters keep only deviations from the defaults, so a pristine
 * tab persists nothing (`undefined`).
 */

export interface AgendaDesignDraft {
  pastEventsMode: PastEventsMode;
  /** Kept whatever the mode — switching away and back never loses the date. */
  pastEventsFromDate: string;
  cardAspectRatio: EventAspectRatio;
  columns: number;
  showLocationOnCards: boolean;
  showFeaturedBackdrop: boolean;
}

export interface EventPageDesignDraft {
  imageAspectRatio: EventAspectRatio;
}

/** The agenda sections' editable texts ('' ↔ absent) — the featured section only has an intro. */
export interface SectionTextsDraft {
  upcomingTitle: string;
  pastTitle: string;
  nextHeader: string;
  upcomingHeader: string;
  pastHeader: string;
}

export const toAgendaDraft = (events: EventsConfig | undefined): AgendaDesignDraft => ({
  pastEventsMode: events?.design?.agendaPage?.pastEventsMode ?? DEFAULT_PAST_EVENTS_MODE,
  pastEventsFromDate: events?.design?.agendaPage?.pastEventsFromDate ?? '',
  cardAspectRatio: events?.design?.agendaPage?.cardAspectRatio ?? DEFAULT_EVENT_CARD_ASPECT_RATIO,
  columns: events?.design?.agendaPage?.columns ?? DEFAULT_EVENT_COLUMNS,
  showLocationOnCards: events?.design?.agendaPage?.showLocationOnCards ?? true,
  showFeaturedBackdrop: events?.design?.agendaPage?.showFeaturedBackdrop ?? true,
});

export const fromAgendaDraft = (draft: AgendaDesignDraft): EventsAgendaDesign | undefined => {
  const design: EventsAgendaDesign = {};
  if (draft.pastEventsMode !== DEFAULT_PAST_EVENTS_MODE) design.pastEventsMode = draft.pastEventsMode;
  if (draft.pastEventsFromDate) design.pastEventsFromDate = draft.pastEventsFromDate;
  if (draft.cardAspectRatio !== DEFAULT_EVENT_CARD_ASPECT_RATIO) design.cardAspectRatio = draft.cardAspectRatio;
  if (draft.columns !== DEFAULT_EVENT_COLUMNS) design.columns = draft.columns;
  if (!draft.showLocationOnCards) design.showLocationOnCards = false;
  if (!draft.showFeaturedBackdrop) design.showFeaturedBackdrop = false;
  return Object.keys(design).length > 0 ? design : undefined;
};

export const toEventPageDraft = (events: EventsConfig | undefined): EventPageDesignDraft => ({
  imageAspectRatio: events?.design?.eventPage?.imageAspectRatio ?? DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
});

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
