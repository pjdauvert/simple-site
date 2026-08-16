import { useEffect, useState } from 'react';
import { ALL_DISABLED, getFeatureFlags, type FeatureFlags } from '../services/featuresService';

/**
 * Loads runtime feature flags once. Returns `null` while loading; on failure it
 * falls back to all-disabled so an unreachable API never exposes a feature.
 */
export const useFeatureFlags = (): FeatureFlags | null => {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);

  useEffect(() => {
    let active = true;
    getFeatureFlags()
      .then((loaded) => { if (active) setFlags(loaded); })
      .catch(() => { if (active) setFlags(ALL_DISABLED); });
    return () => { active = false; };
  }, []);

  return flags;
};
