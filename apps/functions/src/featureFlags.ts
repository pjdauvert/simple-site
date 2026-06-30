/**
 * Server-side feature flags, read from the runtime environment on every request.
 *
 * Unlike a baked-in `VITE_*` var, flipping these takes effect without rebuilding
 * the web bundle (the client learns the value via `GET /api/features`).
 */
export const isMediaEnabled = (): boolean => Netlify.env.get('FEATURE_MEDIA') === 'true';
