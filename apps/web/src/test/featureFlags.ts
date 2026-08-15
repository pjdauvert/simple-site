import { vi } from 'vitest';
import { ALL_DISABLED, type FeatureFlags } from '../services/featuresService';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

/** A feature name — adding a flag widens this automatically. */
export type FeatureName = keyof FeatureFlags;

/**
 * The flag set with everything off except the features named — derived from the
 * real {@link ALL_DISABLED}, so a new flag never has to be added here or in any
 * test. `featuresWith()` (no argument) is the all-off set.
 */
export const featuresWith = (...enabled: FeatureName[]): FeatureFlags =>
  enabled.reduce((flags, name) => ({ ...flags, [name]: true }), { ...ALL_DISABLED });

/**
 * Makes `useFeatureFlags()` report exactly those features for the rest of the
 * test. Requires the test file to have mocked the hook:
 *
 * ```ts
 * vi.mock('../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
 * ```
 *
 * Call it again inside a case to flip a feature off — a `beforeEach` default
 * plus one override per exception reads better than restating the whole set.
 */
export const mockFeatures = (...enabled: FeatureName[]): void => {
  vi.mocked(useFeatureFlags).mockReturnValue(featuresWith(...enabled));
};

/** Makes `useFeatureFlags()` report "still loading" (the hook returns `null`). */
export const mockFeaturesLoading = (): void => {
  vi.mocked(useFeatureFlags).mockReturnValue(null);
};
