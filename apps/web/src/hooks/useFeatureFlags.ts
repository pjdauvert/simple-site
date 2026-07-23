import { useEffect, useState } from 'react';
import { getFeatureFlags, type FeatureFlags } from '../services/featuresService';

/** Used when the flags can't be fetched (e.g. the API is unreachable) or haven't loaded yet. */
export const ALL_DISABLED: FeatureFlags = { media: false };

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
