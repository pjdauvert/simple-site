import { describe, it, expect, afterEach } from 'vitest';
import {
  IK_ZOOM_WIDTHS,
  ikSrcSet,
  ikTransform,
  ikWatermarkLayer,
  ikZoomWidth,
  isImageKitUrl,
  type IkWatermark,
} from './imagekit';

const IK_URL = 'https://ik.imagekit.io/demo/photo.jpg';

describe('ikTransform', () => {
  it('appends the transformation to an ImageKit URL', () => {
    expect(ikTransform(IK_URL, 'w-640,q-80,f-auto')).toBe(`${IK_URL}?tr=w-640,q-80,f-auto`);
  });

  it('joins with & when the URL already has a query string', () => {
    expect(ikTransform(`${IK_URL}?updatedAt=123`, 'w-640')).toBe(`${IK_URL}?updatedAt=123&tr=w-640`);
  });

  it('keeps an explicit transformation instead of stacking a second one', () => {
    expect(ikTransform(`${IK_URL}?tr=w-100`, 'w-640')).toBe(`${IK_URL}?tr=w-100`);
    expect(ikTransform(`${IK_URL}?v=1&tr=w-100`, 'w-640')).toBe(`${IK_URL}?v=1&tr=w-100`);
  });

  it('leaves relative paths and third-party hosts untouched', () => {
    expect(ikTransform('/images/logo.svg', 'h-64')).toBe('/images/logo.svg');
    expect(ikTransform('https://example.com/pic.jpg?a=b', 'w-640')).toBe('https://example.com/pic.jpg?a=b');
  });
});

describe('isImageKitUrl', () => {
  it('matches only the ImageKit delivery host', () => {
    expect(isImageKitUrl(IK_URL)).toBe(true);
    expect(isImageKitUrl('https://example.com/ik.imagekit.io/photo.jpg')).toBe(false);
    expect(isImageKitUrl('/photo.jpg')).toBe(false);
  });
});

describe('ikSrcSet', () => {
  it('builds one entry per width bucket', () => {
    expect(ikSrcSet(IK_URL, [480, 960])).toBe(
      `${IK_URL}?tr=w-480,q-80,f-auto 480w, ${IK_URL}?tr=w-960,q-80,f-auto 960w`,
    );
  });

  it('is undefined when transformations do not apply', () => {
    expect(ikSrcSet('/images/pic.jpg', [480, 960])).toBeUndefined();
    expect(ikSrcSet(`${IK_URL}?tr=w-100`, [480, 960])).toBeUndefined();
  });
});

describe('ikWatermarkLayer', () => {
  const watermark: IkWatermark = { text: '© Studio', position: 'bottomRight', color: '#FFFFFF', opacity: 60 };

  it('builds the CDN text layer — base64 text, absolute font size, alpha in the color', () => {
    // 60 % of 255 = 153 = 0x99; the font size is ~4.5 % of the rendition width.
    // The text box is bounded at 90 % of the rendition (wraps beyond), aligned
    // toward the anchored side and inset by a font-proportional padding — an
    // unbounded layer gets clipped at the image edge by the CDN.
    expect(ikWatermarkLayer(watermark, 1000)).toBe(
      ',l-text,ie-wqkgU3R1ZGlv,fs-45,co-FFFFFF99,w-900,ia-right,pa-27,lfo-bottom_right,l-end',
    );
  });

  it('scales the font size per rendition, never below a legible floor', () => {
    expect(ikWatermarkLayer(watermark, 2000)).toContain('fs-90');
    expect(ikWatermarkLayer(watermark, 100)).toContain('fs-12');
  });

  it('maps every position to its CDN focus, aligning the text toward that side', () => {
    const topLeft = ikWatermarkLayer({ ...watermark, position: 'topLeft' }, 800);
    expect(topLeft).toContain('lfo-top_left');
    expect(topLeft).toContain(',ia-left,');
    const center = ikWatermarkLayer({ ...watermark, position: 'center' }, 800);
    expect(center).toContain('lfo-center');
    expect(center).toContain(',ia-center,');
    // The width bound scales with the rendition, like the font size.
    expect(center).toContain(',w-720,');
  });

  it('encodes non-ASCII text safely and is empty without a watermark', () => {
    // Emoji/accents survive the UTF-8 → base64 round trip (url-safe alphabet).
    expect(ikWatermarkLayer({ ...watermark, text: '🙂 Photo' }, 600)).toContain('ie-8J-ZgiBQaG90bw==');
    expect(ikWatermarkLayer(undefined, 600)).toBe('');
    expect(ikWatermarkLayer({ ...watermark, text: '   ' }, 600)).toBe('');
  });

  it('rides along each srcSet bucket, sized for that bucket', () => {
    const srcSet = ikSrcSet(IK_URL, [480, 960], 'q-80,f-auto', watermark) ?? '';
    expect(srcSet).toContain('w-480,q-80,f-auto,l-text,ie-wqkgU3R1ZGlv,fs-22,');
    expect(srcSet).toContain('w-960,q-80,f-auto,l-text,ie-wqkgU3R1ZGlv,fs-43,');
  });
});

describe('ikZoomWidth', () => {
  const original = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
  };

  afterEach(() => {
    window.innerWidth = original.width;
    window.innerHeight = original.height;
    window.devicePixelRatio = original.dpr;
  });

  it('picks the smallest bucket covering the larger viewport dimension × DPR', () => {
    window.innerWidth = 800;
    window.innerHeight = 600;
    window.devicePixelRatio = 1;
    expect(ikZoomWidth()).toBe(960);

    window.devicePixelRatio = 2;
    expect(ikZoomWidth()).toBe(1920);

    // Portrait: the height drives the requirement.
    window.innerWidth = 400;
    window.innerHeight = 1000;
    window.devicePixelRatio = 1;
    expect(ikZoomWidth()).toBe(1280);
  });

  it('caps the DPR at 2 and the width at the largest bucket', () => {
    window.innerWidth = 1000;
    window.innerHeight = 800;
    window.devicePixelRatio = 3;
    expect(ikZoomWidth()).toBe(IK_ZOOM_WIDTHS.find((w) => w >= 2000));

    window.innerWidth = 4000;
    window.innerHeight = 3000;
    window.devicePixelRatio = 2;
    expect(ikZoomWidth()).toBe(IK_ZOOM_WIDTHS[IK_ZOOM_WIDTHS.length - 1]);
  });
});
