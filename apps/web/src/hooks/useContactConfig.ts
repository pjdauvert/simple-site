import { useEffect, useState } from 'react';
import type { ContactConfig } from '@simple-site/interfaces';
import { loadContactConfig } from '../services/contactService';

export interface UseContactConfigResult {
  /** `null` while loading (or while `enabled` is false without an error). */
  config: ContactConfig | null;
  error: string | null;
}

/**
 * Loads the public contact page settings once. Pass `enabled: false` while the
 * feature flag is unknown or off — no request is made (the server would 404
 * anyway).
 */
export const useContactConfig = (enabled: boolean): UseContactConfigResult => {
  const [config, setConfig] = useState<ContactConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadContactConfig()
      .then((loaded) => { if (active) setConfig(loaded); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Failed to load the contact settings'); });
    return () => { active = false; };
  }, [enabled]);

  return { config, error };
};
