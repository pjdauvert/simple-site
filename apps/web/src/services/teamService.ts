import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, TeamConfig } from '@simple-site/interfaces';
import { TeamConfigSchema } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Team service. The team lives in its own blob with a DIRECT-SAVE lifecycle —
 * `saveTeam` is live immediately (no draft/publish). Reads are public (the site
 * renders them); the write is admin-gated. The whole `/api/team` surface 404s
 * when the `team` feature flag is off.
 */

/** Fetches the whole team (empty members when nothing is stored yet). */
export const loadTeam = async (): Promise<TeamConfig> => {
  const response = await apiService.get<TeamConfig>('team');
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return TeamConfigSchema.parse((response as ApiResponseSuccessPayload<TeamConfig>).data);
};

/** Replaces the whole team. Changes are LIVE immediately. */
export const saveTeam = async (team: TeamConfig): Promise<void> => {
  const response = await apiService.put<TeamConfig, { message: string }>('team', team);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
