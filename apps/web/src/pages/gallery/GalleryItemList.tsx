import React, { useState } from 'react';
import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryItemKey, galleryTagNameKey, type GalleryItem, type GalleryTag } from '@simple-site/interfaces';
import type { SxProps, Theme } from '@mui/material/styles';
import { ikSrcSet, ikTransform, ikWatermarkLayer } from '../../utils/imagekit';
import {
  GALLERY_SPACING_UNITS,
  GALLERY_STACK_SPACING_UNITS,
  galleryAspectRatioValue,
  galleryColumnsSx,
  galleryTagRoute,
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
  /**
   * The declared tags, provided by the GENERAL page only: each item then shows
   * its tags as discreet clickable chips overlaid on the image's bottom edge —
   * the same treatment in every display mode — navigating to the tag's
   * collection. Collection pages omit the prop — no chips there.
   */
  tags?: readonly GalleryTag[];
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
  tags,
  captionPosition,
  displayMode,
  itemShowTitle,
  itemShowSubtitle,
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

  /**
   * The item's tags as discreet chips overlaying the image's bottom edge —
   * the SAME treatment in every display mode (the tile is the tag's home, the
   * caption stays text-only). Semi-transparent so the shot keeps reading.
   */
  const tagChips = (item: GalleryItem): React.ReactNode => {
    const itemTags = item.tags ?? []; // tolerant — stored configs may predate `tags`
    if (!tags || itemTags.length === 0) return null;
    const declared = tags.filter((tag) => itemTags.includes(tag.tag));
    if (declared.length === 0) return null;
    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: 6,
          left: 6,
          right: 6,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          gap: 0.5,
        }}
      >
        {declared.map((tag) => (
          <Chip
            key={tag.tag}
            size="small"
            clickable
            component={RouterLink}
            to={galleryTagRoute(tag.tag)}
            label={<FormattedMessage id={galleryTagNameKey(tag.tag)} defaultMessage={tag.displayName} />}
            sx={{
              height: 20,
              bgcolor: 'rgba(0, 0, 0, 0.55)',
              color: 'common.white',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.75)' },
              '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' },
            }}
          />
        ))}
      </Box>
    );
  };

  const caption = (item: GalleryItem, index: number, sx?: SxProps<Theme>): React.ReactNode => {
    const showSubtitle = itemShowSubtitle && Boolean(item.subtitle?.trim());
    // Both toggled off → no caption block at all (the zoom view keeps them).
    if (!itemShowTitle && !showSubtitle) return null;
    return (
      <Box key="caption" sx={{ textAlign: 'center', ...sx }}>
        {itemShowTitle && (
          <Typography variant="h6" component="h3">
            <FormattedMessage id={galleryItemKey(index, 'title')} defaultMessage={item.title} />
          </Typography>
        )}
        {showSubtitle && (
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage id={galleryItemKey(index, 'subtitle')} defaultMessage={item.subtitle} />
          </Typography>
        )}
      </Box>
    );
  };

  /**
   * The clickable image wrapped with its chip overlay. The wrapper hugs the
   * button (which hugs the image in the content-sized modes), so the chips
   * always anchor to the IMAGE's bottom edge; `wrapperSx` carries the mode's
   * sizing (e.g. `width: '100%'` in the tiled modes). The design's per-item
   * width cap rides on the wrapper so the overlay can never outgrow a capped
   * image. Chips are links — siblings of the button, never nested in it.
   */
  const imageButton = (
    item: GalleryItem,
    index: number,
    visibleIndex: number,
    delivery: { width: number; widths: readonly number[]; sizes: string },
    imgSx: SxProps<Theme>,
    buttonSx?: SxProps<Theme>,
    wrapperSx?: SxProps<Theme>,
  ): React.ReactNode => (
    <Box
      key="image"
      sx={{
        position: 'relative',
        maxWidth: '100%',
        // The design's per-item cap (% of the screen, landscape only).
        ...itemWidthCapSx(itemMaxWidthPercent),
        ...wrapperSx,
      }}
    >
      <ButtonBase
        onClick={() => setZoomIndex(visibleIndex)}
        focusRipple
        sx={{
          display: 'block',
          maxWidth: '100%',
          // The frame options apply to the clickable image in every mode.
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
          alt={intl.formatMessage({ id: galleryItemKey(index, 'title'), defaultMessage: item.title })}
          onError={() => markFailed(item.imageUrl)}
          sx={imgSx}
        />
      </ButtonBase>
      {tagChips(item)}
    </Box>
  );

  const lightbox = (
    <GalleryLightbox
      entries={visible}
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
              key={index}
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
            <Box key={index} sx={{ breakInside: 'avoid', mb: gap }}>
              {imageButton(
                item,
                index,
                visibleIndex,
                { width: 640, widths: TILE_WIDTHS, sizes: tileSizes },
                { display: 'block', width: '100%', height: 'auto' },
                { width: '100%' },
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
              key={index}
              sx={{
                display: 'flex',
                // Sides flip on every row on desktop; mobile always stacks.
                flexDirection: { xs: 'column', md: visibleIndex % 2 === 1 ? 'row-reverse' : 'row' },
                alignItems: 'center',
                gap: { xs: 1.5, md: 5 },
              }}
            >
              {/* The row cell stays outside so the chip overlay hugs the image
                  itself, not the 58% column around it. */}
              <Box sx={{ width: { md: '58%' }, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                {imageButton(
                  item,
                  index,
                  visibleIndex,
                  { width: 1080, widths: LIST_WIDTHS, sizes: ALTERNATE_SIZES },
                  { display: 'block', maxWidth: '100%', maxHeight: { xs: '60vh', md: '65vh' }, width: 'auto', height: 'auto' },
                )}
              </Box>
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
              key={index}
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
