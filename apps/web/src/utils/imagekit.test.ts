import { describe, it, expect, afterEach } from 'vitest';
import { IK_ZOOM_WIDTHS, ikSrcSet, ikTransform, ikZoomWidth, isImageKitUrl } from './imagekit';

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
