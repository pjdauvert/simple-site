import { useEffect, useState } from 'react';
import type { TeamConfig } from '@simple-site/interfaces';
import { loadTeam } from '../services/teamService';

export interface UseTeamResult {
  /** `null` while loading (or while `enabled` is false without an error). */
  team: TeamConfig | null;
  error: string | null;
}

/**
 * Loads the public team once. Pass `enabled: false` while the feature flag is
 * unknown or off — no request is made (the server would 404 anyway).
 */
export const useTeam = (enabled: boolean): UseTeamResult => {
  const [team, setTeam] = useState<TeamConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadTeam()
      .then((loaded) => { if (active) setTeam(loaded); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Failed to load the team'); });
    return () => { active = false; };
  }, [enabled]);

  return { team, error };
};
