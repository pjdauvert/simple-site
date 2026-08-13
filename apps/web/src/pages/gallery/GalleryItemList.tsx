import React, { useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryItemKey, type GalleryItem } from '@simple-site/interfaces';
import type { SxProps, Theme } from '@mui/material/styles';
import { ikSrcSet, ikTransform, ikWatermarkLayer } from '../../utils/imagekit';
import {
  GALLERY_SPACING_UNITS,
  GALLERY_STACK_SPACING_UNITS,
  galleryAspectRatioValue,
  galleryColumnsSx,
  itemFrameSx,
  itemWidthCapSx,
  type DisplayableGalleryItem,
  type GalleryDisplaySettings,
} from './galleryDisplay';
import { GalleryLightbox } from './GalleryLightbox';

/** Delivery buckets for the list/alternate shots — they can span the container. */
const LIST_WIDTHS = [480, 768, 1080, 1440, 1920] as const;
/** Approximates the centered column: full-bleed on mobile, the lg container above. */
const LIST_SIZES = '(min-width: 1200px) 1152px, 100vw';
/** Tiled modes: buckets and hints scale with the picked column count. */
const TILE_WIDTHS = [320, 480, 640, 960] as const;
/** Alternate rows give the image roughly the wider side of the row. */
const ALTERNATE_SIZES = '(min-width: 900px) 58vw, 100vw';

interface GalleryItemListProps extends GalleryDisplaySettings {
  /** Displayable entries (image present), with their config positions for i18n. */
  entries: DisplayableGalleryItem[];
  /** i18n scope of the list (`gallery` or `gallery.theme.<themeId>`). */
  scope: string;
}

/**
 * The browsing view of a gallery list, in the design's display mode. The
 * caption setting applies to `list` ONLY:
 * - `list` (default) — centered shots, caption above/below/left/right per the
 *   caption setting (side captions stack on mobile: left → above, right → below);
 * - `grid` — a responsive card grid (the design's column count on desktop,
 *   collapsing on narrow screens), caption always below the image, tiles
 *   sharing the design's imposed ratio;
 * - `mosaic` — masonry columns of natural-height tiles, with NO caption at all
 *   (the title/subtitle still show in the zoom view);
 * - `alternate` — full-width rows whose image/caption sides flip on every row
 *   (like the team page's alternating layout; mobile stacks); the alternation
 *   places the caption itself.
 * Clicking a shot opens the zoom carousel over the same list, whatever the
 * mode. An image that fails to load drops its whole item, matching the
 * missing-image rule.
 */
export const GalleryItemList: React.FC<GalleryItemListProps> = ({
  entries,
  scope,
  captionPosition,
  displayMode,
  itemMaxWidthPercent,
  itemElevation,
  itemBorder,
  itemBorderColor,
  itemCornerRadius,
  itemColumns,
  itemAspectRatio,
  itemFit,
  itemSpacing,
  watermark,
}) => {
  const intl = useIntl();
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(new Set());

  const visible = entries.filter(({ item }) => !failedUrls.has(item.imageUrl ?? ''));
  const captionFirst = captionPosition === 'above' || captionPosition === 'left';
  const sideCaption = captionPosition === 'left' || captionPosition === 'right';
  const gap = GALLERY_SPACING_UNITS[itemSpacing];
  const stackGap = GALLERY_STACK_SPACING_UNITS[itemSpacing];
  const columns = galleryColumnsSx(itemColumns);
  /** A tile is roughly the container split into `itemColumns` on wide screens. */
  const tileSizes = `(min-width: 900px) ${Math.round(100 / itemColumns)}vw, (min-width: 600px) 50vw, 100vw`;

  const markFailed = (url: string | undefined): void => {
    if (!url) return;
    setFailedUrls((prev) => new Set(prev).add(url));
    setZoomIndex(null);
  };

  const caption = (item: GalleryItem, index: number, sx?: SxProps<Theme>): React.ReactNode => (
    <Box key="caption" sx={{ textAlign: 'center', ...sx }}>
      <Typography variant="h6" component="h3">
        <FormattedMessage id={galleryItemKey(scope, index, 'title')} defaultMessage={item.title} />
      </Typography>
      {item.subtitle?.trim() && (
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id={galleryItemKey(scope, index, 'subtitle')} defaultMessage={item.subtitle} />
        </Typography>
      )}
    </Box>
  );

  const imageButton = (
    item: GalleryItem,
    index: number,
    visibleIndex: number,
    delivery: { width: number; widths: readonly number[]; sizes: string },
    imgSx: SxProps<Theme>,
    buttonSx?: SxProps<Theme>,
  ): React.ReactNode => (
    <ButtonBase
      key="image"
      onClick={() => setZoomIndex(visibleIndex)}
      focusRipple
      sx={{
        display: 'block',
        maxWidth: '100%',
        // The design's per-item cap (% of the screen, landscape only) and the
        // frame options apply to the clickable image in every mode.
        ...itemWidthCapSx(itemMaxWidthPercent),
        ...itemFrameSx({ itemElevation, itemBorder, itemBorderColor, itemCornerRadius }),
        cursor: 'zoom-in',
        overflow: 'hidden',
        ...buttonSx,
      }}
    >
      <Box
        component="img"
        src={ikTransform(
          item.imageUrl ?? '',
          `w-${delivery.width},q-80,f-auto${ikWatermarkLayer(watermark, delivery.width)}`,
        )}
        srcSet={ikSrcSet(item.imageUrl ?? '', delivery.widths, 'q-80,f-auto', watermark)}
        sizes={delivery.sizes}
        // The first shot is the likely LCP — only the rest load lazily.
        loading={visibleIndex === 0 ? undefined : 'lazy'}
        decoding="async"
        alt={intl.formatMessage({ id: galleryItemKey(scope, index, 'title'), defaultMessage: item.title })}
        onError={() => markFailed(item.imageUrl)}
        sx={imgSx}
      />
    </ButtonBase>
  );

  const lightbox = (
    <GalleryLightbox
      entries={visible}
      scope={scope}
      index={zoomIndex}
      watermark={watermark}
      onClose={() => setZoomIndex(null)}
      onNavigate={setZoomIndex}
    />
  );

  if (displayMode === 'grid') {
    // The caption always sits below the image in a grid cell, and the tiles
    // share the design's imposed ratio (`original` keeps each image's own).
    const aspectRatio = galleryAspectRatioValue(itemAspectRatio);
    return (
      <>
        <Box data-testid="gallery-grid" sx={{ display: 'grid', gridTemplateColumns: columns, gap }}>
          {visible.map(({ item, index }, visibleIndex) => (
            <Box
              key={`${scope}-${index}`}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
            >
              {imageButton(
                item,
                index,
                visibleIndex,
                { width: 640, widths: TILE_WIDTHS, sizes: tileSizes },
                {
                  display: 'block',
                  width: '100%',
                  ...(aspectRatio ? { aspectRatio, objectFit: itemFit } : { height: 'auto' }),
                },
                { width: '100%' },
              )}
              {caption(item, index)}
            </Box>
          ))}
        </Box>
        {lightbox}
      </>
    );
  }

  if (displayMode === 'mosaic') {
    // No caption in a mosaic — the tiles are pure images (their title/subtitle
    // still show in the zoom view). CSS-columns masonry: natural aspect,
    // packed top to bottom per column.
    return (
      <>
        <Box data-testid="gallery-mosaic" sx={{ columnCount: { xs: 1, sm: 2, md: itemColumns }, columnGap: gap }}>
          {visible.map(({ item, index }, visibleIndex) => (
            <Box key={`${scope}-${index}`} sx={{ breakInside: 'avoid', mb: gap }}>
              {imageButton(
                item,
                index,
                visibleIndex,
                { width: 640, widths: TILE_WIDTHS, sizes: tileSizes },
                { display: 'block', width: '100%', height: 'auto' },
                { width: '100%' },
              )}
            </Box>
          ))}
        </Box>
        {lightbox}
      </>
    );
  }

  if (displayMode === 'alternate') {
    return (
      <>
        <Stack spacing={stackGap}>
          {visible.map(({ item, index }, visibleIndex) => (
            <Box
              key={`${scope}-${index}`}
              sx={{
                display: 'flex',
                // Sides flip on every row on desktop; mobile always stacks.
                flexDirection: { xs: 'column', md: visibleIndex % 2 === 1 ? 'row-reverse' : 'row' },
                alignItems: 'center',
                gap: { xs: 1.5, md: 5 },
              }}
            >
              {imageButton(
                item,
                index,
                visibleIndex,
                { width: 1080, widths: LIST_WIDTHS, sizes: ALTERNATE_SIZES },
                { display: 'block', maxWidth: '100%', maxHeight: { xs: '60vh', md: '65vh' }, width: 'auto', height: 'auto' },
                { width: { md: '58%' }, flexShrink: 0, display: 'flex', justifyContent: 'center' },
              )}
              {caption(item, index, { flex: 1 })}
            </Box>
          ))}
        </Stack>
        {lightbox}
      </>
    );
  }

  return (
    <>
      <Stack spacing={stackGap}>
        {visible.map(({ item, index }, visibleIndex) => {
          const rowCaption = caption(item, index, sideCaption ? { maxWidth: { md: 280 }, flexShrink: 0 } : undefined);
          const rowImage = imageButton(
            item,
            index,
            visibleIndex,
            { width: 1080, widths: LIST_WIDTHS, sizes: LIST_SIZES },
            { display: 'block', maxWidth: '100%', maxHeight: { xs: '60vh', md: '70vh' }, width: 'auto', height: 'auto' },
          );
          return (
            <Box
              key={`${scope}-${index}`}
              sx={{
                display: 'flex',
                flexDirection: sideCaption ? { xs: 'column', md: 'row' } : 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1.5, md: sideCaption ? 4 : 1.5 },
              }}
            >
              {captionFirst ? [rowCaption, rowImage] : [rowImage, rowCaption]}
            </Box>
          );
        })}
      </Stack>
      {lightbox}
    </>
  );
};
