import type { ApiResponseErrorPayload, EventsConfig } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Events admin service.
 *
 * Reads come from the working draft (`loadDraftConfig`, see `configVersionService`).
 * Writes hit the flag-gated, admin-gated `PUT /api/config/events`, which replaces
 * the `events` block of the DRAFT and re-validates the entire config server-side.
 * Changes go live only when published from the Config Versions panel.
 */

/** Replaces the entire `events` block of the config draft. */
export const updateEvents = async (events: EventsConfig): Promise<void> => {
  const response = await apiService.put<EventsConfig, { message: string }>('config/events', events);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
