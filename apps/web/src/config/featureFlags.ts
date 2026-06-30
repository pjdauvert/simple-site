/**
 * Build-time feature flags, driven by Vite env vars (`VITE_*`).
 *
 * A flag is on only when its variable is exactly the string `"true"`; an absent
 * or any other value means off. Flags are evaluated once at module load.
 */
export const featureFlags = {
  /** Admin Media library — the `/manage/media` page and its nav entry. */
  media: import.meta.env.VITE_FEATURE_MEDIA === 'true',
} as const;
