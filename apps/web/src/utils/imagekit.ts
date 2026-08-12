/**
 * ImageKit delivery-time optimisation. Every image the app renders goes
 * through these helpers so the visitor downloads a right-sized, auto-format
 * (WebP/AVIF via `f-auto`) rendition instead of the stored original.
 *
 * Transformations only apply to URLs ImageKit actually serves — anything else
 * (relative paths, third-party hosts) is returned untouched, and a URL already
 * carrying a `tr=` keeps its explicit transformation. This replaces the old
 * blind `?tr=` string appends, which broke URLs that already had a query
 * string and polluted non-ImageKit ones.
 */

const IMAGEKIT_URL = /^https?:\/\/ik\.imagekit\.io\//;

export const isImageKitUrl = (url: string): boolean => IMAGEKIT_URL.test(url);

/** True when `url` can take a new transformation (ImageKit-served, none yet). */
const isTransformable = (url: string): boolean => isImageKitUrl(url) && !/[?&]tr=/.test(url);

/**
 * Returns `url` with the ImageKit transformation appended (`w-640,q-80,f-auto`
 * style), or untouched when transformations don't apply to it.
 */
export const ikTransform = (url: string, transformation: string): string =>
  isTransformable(url) ? `${url}${url.includes('?') ? '&' : '?'}tr=${transformation}` : url;

/**
 * A `srcSet` of width buckets for responsive images (pair it with a `sizes`
 * attribute), or undefined when transformations don't apply to `url`.
 */
export const ikSrcSet = (
  url: string,
  widths: readonly number[],
  extra = 'q-80,f-auto',
): string | undefined =>
  isTransformable(url)
    ? widths.map((width) => `${ikTransform(url, `w-${width},${extra}`)} ${width}w`).join(', ')
    : undefined;

/** Delivery buckets for the fullscreen zoom — few enough to keep CDN caches warm. */
export const IK_ZOOM_WIDTHS: readonly number[] = [960, 1280, 1920, 2560];

/**
 * The zoom view's delivery width: the smallest bucket covering the viewport's
 * larger dimension at the device's pixel ratio (capped at 2× — beyond that the
 * extra bytes outweigh the visible gain).
 */
export const ikZoomWidth = (): number => {
  const fallback = IK_ZOOM_WIDTHS[IK_ZOOM_WIDTHS.length - 1];
  if (typeof window === 'undefined') return fallback;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const needed = Math.max(window.innerWidth, window.innerHeight) * dpr;
  return IK_ZOOM_WIDTHS.find((width) => width >= needed) ?? fallback;
};
