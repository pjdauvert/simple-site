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
import type { GalleryWatermarkPosition } from '@simple-site/interfaces';

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

// ---------------------------------------------------------------------------
// Watermark (text overlay layer)
//
// ImageKit burns the text into the delivered rendition — the stored original is
// never touched. Contract verified against the API:
//  - the text travels base64-encoded (`ie-`), so any character is safe;
//  - `fs` (font size) must be an ABSOLUTE number: arithmetic expressions like
//    `fs-bw_mul_0.05` are rejected, so each rendition computes its own size
//    from its width — which is exactly what keeps the mark proportional across
//    a responsive `srcSet`;
//  - the layer opacity parameter is rejected too, so the opacity rides in the
//    color's alpha channel (`co-RRGGBBAA`);
//  - positions map to `lfo-<focus>` — but an unbounded text layer wider than
//    the image gets CLIPPED at the edge (most visibly with right anchors), so
//    every layer bounds its text at 90 % of the rendition (`w`, wraps beyond),
//    aligns it inside the box toward the anchored side (`ia`) and insets it
//    from the edges with a font-proportional padding (`pa`) — that trio keeps
//    the mark fully readable at every position.
// ---------------------------------------------------------------------------

/** The watermark a public rendition carries, resolved from the gallery design. */
export interface IkWatermark {
  text: string;
  position: GalleryWatermarkPosition;
  /** `#RRGGBB`. */
  color: string;
  /** Percent (10–100), applied as the color's alpha. */
  opacity: number;
}

/** CDN anchor of each position, and the matching alignment inside the text box. */
const IK_WATERMARK_FOCUS: Record<GalleryWatermarkPosition, { focus: string; align: 'left' | 'center' | 'right' }> = {
  bottomRight: { focus: 'bottom_right', align: 'right' },
  bottomLeft: { focus: 'bottom_left', align: 'left' },
  topRight: { focus: 'top_right', align: 'right' },
  topLeft: { focus: 'top_left', align: 'left' },
  center: { focus: 'center', align: 'center' },
};

/** Font size of the mark on a rendition: ~4.5 % of its width, never microscopic. */
const watermarkFontSize = (renditionWidth: number): number => Math.max(12, Math.round(renditionWidth * 0.045));

/** UTF-8 safe base64 (url-safe alphabet — ImageKit accepts both). */
const base64Utf8 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
};

/**
 * The `,l-text,…,l-end` fragment to append to a transformation, or '' when
 * there is no watermark to draw.
 */
export const ikWatermarkLayer = (watermark: IkWatermark | undefined, renditionWidth: number): string => {
  const text = watermark?.text.trim();
  if (!watermark || !text) return '';
  const alpha = Math.round((Math.min(100, Math.max(10, watermark.opacity)) / 100) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  const color = `${watermark.color.replace('#', '').toUpperCase()}${alpha}`;
  const fontSize = watermarkFontSize(renditionWidth);
  const { focus, align } = IK_WATERMARK_FOCUS[watermark.position];
  return (
    `,l-text,ie-${base64Utf8(text)},fs-${fontSize},co-${color}` +
    `,w-${Math.round(renditionWidth * 0.9)},ia-${align},pa-${Math.max(6, Math.round(fontSize * 0.6))}` +
    `,lfo-${focus},l-end`
  );
};

/**
 * A `srcSet` of width buckets for responsive images (pair it with a `sizes`
 * attribute), or undefined when transformations don't apply to `url`. Each
 * bucket carries its own watermark layer, sized for that rendition.
 */
export const ikSrcSet = (
  url: string,
  widths: readonly number[],
  extra = 'q-80,f-auto',
  watermark?: IkWatermark,
): string | undefined =>
  isTransformable(url)
    ? widths
        .map(
          (width) =>
            `${ikTransform(url, `w-${width},${extra}${ikWatermarkLayer(watermark, width)}`)} ${width}w`,
        )
        .join(', ')
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
