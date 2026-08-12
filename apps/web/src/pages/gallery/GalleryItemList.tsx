import React, { useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  galleryItemKey,
  type GalleryCaptionPosition,
  type GalleryDisplayMode,
  type GalleryItem,
} from '@simple-site/interfaces';
import type { SxProps, Theme } from '@mui/material/styles';
import { ikSrcSet, ikTransform } from '../../utils/imagekit';
import type { DisplayableGalleryItem } from './galleryDisplay';
import { GalleryLightbox } from './GalleryLightbox';

/** Delivery buckets for the list/alternate shots — they can span the container. */
const LIST_WIDTHS = [480, 768, 1080, 1440, 1920] as const;
/** Approximates the centered column: full-bleed on mobile, the lg container above. */
const LIST_SIZES = '(min-width: 1200px) 1152px, 100vw';
/** Grid cells are 1–3 per row — smaller buckets, cell-sized hints. */
const GRID_WIDTHS = [320, 480, 640, 960] as const;
const GRID_SIZES = '(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw';
/** Alternate rows give the image roughly the wider side of the row. */
const ALTERNATE_SIZES = '(min-width: 900px) 58vw, 100vw';

interface GalleryItemListProps {
  /** Displayable entries (image present), with their config positions for i18n. */
  entries: DisplayableGalleryItem[];
  /** i18n scope of the list (`gallery` or `gallery.theme.<themeId>`). */
  scope: string;
  captionPosition: GalleryCaptionPosition;
  displayMode: GalleryDisplayMode;
}

/**
 * The browsing view of a gallery list, in the design's display mode. The
 * caption setting applies to `list` ONLY:
 * - `list` (default) — centered shots, caption above/below/left/right per the
 *   caption setting (side captions stack on mobile: left → above, right → below);
 * - `grid` — a responsive card grid, caption always below the image;
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
}) => {
  const intl = useIntl();
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(new Set());

  const visible = entries.filter(({ item }) => !failedUrls.has(item.imageUrl ?? ''));
  const captionFirst = captionPosition === 'above' || captionPosition === 'left';
  const sideCaption = captionPosition === 'left' || captionPosition === 'right';

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
    delivery: { transformation: string; widths: readonly number[]; sizes: string },
    imgSx: SxProps<Theme>,
    buttonSx?: SxProps<Theme>,
  ): React.ReactNode => (
    <ButtonBase
      key="image"
      onClick={() => setZoomIndex(visibleIndex)}
      focusRipple
      sx={{ display: 'block', maxWidth: '100%', cursor: 'zoom-in', borderRadius: 1, overflow: 'hidden', ...buttonSx }}
    >
      <Box
        component="img"
        src={ikTransform(item.imageUrl ?? '', delivery.transformation)}
        srcSet={ikSrcSet(item.imageUrl ?? '', delivery.widths)}
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
      onClose={() => setZoomIndex(null)}
      onNavigate={setZoomIndex}
    />
  );

  if (displayMode === 'grid') {
    // The caption always sits below the image in a grid cell.
    return (
      <>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {visible.map(({ item, index }, visibleIndex) => (
            <Box
              key={`${scope}-${index}`}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
            >
              {imageButton(
                item,
                index,
                visibleIndex,
                { transformation: 'w-640,q-80,f-auto', widths: GRID_WIDTHS, sizes: GRID_SIZES },
                { display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' },
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
        <Box sx={{ columnCount: { xs: 1, sm: 2, md: 3 }, columnGap: { xs: 2, md: 3 } }}>
          {visible.map(({ item, index }, visibleIndex) => (
            <Box key={`${scope}-${index}`} sx={{ breakInside: 'avoid', mb: { xs: 2, md: 3 } }}>
              {imageButton(
                item,
                index,
                visibleIndex,
                { transformation: 'w-640,q-80,f-auto', widths: GRID_WIDTHS, sizes: GRID_SIZES },
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
        <Stack spacing={{ xs: 6, md: 8 }}>
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
                { transformation: 'w-1080,q-80,f-auto', widths: LIST_WIDTHS, sizes: ALTERNATE_SIZES },
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
      <Stack spacing={{ xs: 6, md: 8 }}>
        {visible.map(({ item, index }, visibleIndex) => {
          const rowCaption = caption(item, index, sideCaption ? { maxWidth: { md: 280 }, flexShrink: 0 } : undefined);
          const rowImage = imageButton(
            item,
            index,
            visibleIndex,
            { transformation: 'w-1080,q-80,f-auto', widths: LIST_WIDTHS, sizes: LIST_SIZES },
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
