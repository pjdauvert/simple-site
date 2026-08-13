import React, { useEffect, useRef } from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryItemKey } from '@simple-site/interfaces';
import { ikTransform, ikWatermarkLayer, ikZoomWidth, type IkWatermark } from '../../utils/imagekit';
import type { DisplayableGalleryItem } from './galleryDisplay';

interface GalleryLightboxProps {
  /** The displayable entries being browsed (a theme's list or the root list). */
  entries: DisplayableGalleryItem[];
  /** i18n scope of the list (`gallery` or `gallery.theme.<themeId>`). */
  scope: string;
  /** Position in `entries` of the zoomed item, or null when closed. */
  index: number | null;
  /** Watermark burnt into the zoomed rendition (same design as the lists). */
  watermark?: IkWatermark;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** Overlay control shared by the close button and the carousel arrows. */
const controlSx = {
  color: 'common.white',
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.65)' },
  minWidth: 44,
  minHeight: 44,
} as const;

/** Below this horizontal travel a touch is a tap or a scroll, not a swipe. */
const SWIPE_THRESHOLD_PX = 50;
/** The zoom rendition: sized to the visitor's viewport (bucketed for CDN caching). */
const zoomTransformation = (watermark: IkWatermark | undefined): string => {
  const width = ikZoomWidth();
  return `w-${width},q-80,f-auto${ikWatermarkLayer(watermark, width)}`;
};

/**
 * Zoom mode: the clicked image maximised to what the screen can offer
 * (contained, never cropped) with its title/subtitle kept visible underneath,
 * and left/right arrows to keep browsing the same list as a wrap-around
 * carousel. Escape or the close button returns to the list; the keyboard
 * arrows navigate, and so does a horizontal swipe on touch screens. A counter
 * situates the visitor in the list.
 */
export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  entries,
  scope,
  index,
  watermark,
  onClose,
  onNavigate,
}) => {
  const intl = useIntl();
  const entry = index !== null ? entries[index] : undefined;
  const count = entries.length;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const goTo = (offset: number): void => {
    if (index === null || count < 2) return;
    onNavigate((index + offset + count) % count);
  };

  // Warm the carousel neighbors at the same rendition, so the arrows feel
  // instant — the browser caches the request the <img> will make next.
  useEffect(() => {
    if (index === null || count < 2) return;
    const transformation = zoomTransformation(watermark);
    for (const offset of [-1, 1]) {
      const neighbor = entries[(index + offset + count) % count];
      if (neighbor?.item.imageUrl) new Image().src = ikTransform(neighbor.item.imageUrl, transformation);
    }
  }, [index, entries, count, watermark]);

  /** Horizontal swipes navigate; vertical travel is left to the browser. */
  const handleTouchStart = (event: React.TouchEvent): void => {
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: React.TouchEvent): void => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    // Swiping left walks forward, like every photo viewer.
    goTo(deltaX < 0 ? 1 : -1);
  };

  return (
    <Dialog
      fullScreen
      open={entry !== undefined}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') goTo(-1);
        if (event.key === 'ArrowRight') goTo(1);
      }}
      slotProps={{ paper: { sx: { backgroundColor: 'common.black', color: 'common.white' } } }}
    >
      {entry && (
        <Box
          sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <IconButton
            onClick={onClose}
            aria-label={intl.formatMessage({ id: 'page.gallery.lightbox.close' })}
            sx={{ ...controlSx, position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          >
            <CloseIcon />
          </IconButton>

          <Box
            component="img"
            src={ikTransform(entry.item.imageUrl ?? '', zoomTransformation(watermark))}
            alt={intl.formatMessage({
              id: galleryItemKey(scope, entry.index, 'title'),
              defaultMessage: entry.item.title,
            })}
            sx={{ flex: 1, minHeight: 0, width: '100%', objectFit: 'contain' }}
          />

          {count > 1 && (
            <>
              <IconButton
                onClick={() => goTo(-1)}
                aria-label={intl.formatMessage({ id: 'page.gallery.lightbox.previous' })}
                sx={{
                  ...controlSx,
                  position: 'absolute',
                  left: { xs: 4, md: 16 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <ChevronLeftIcon fontSize="large" />
              </IconButton>
              <IconButton
                onClick={() => goTo(1)}
                aria-label={intl.formatMessage({ id: 'page.gallery.lightbox.next' })}
                sx={{
                  ...controlSx,
                  position: 'absolute',
                  right: { xs: 4, md: 16 },
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <ChevronRightIcon fontSize="large" />
              </IconButton>
            </>
          )}

          <Box sx={{ textAlign: 'center', px: 2, py: { xs: 1.5, md: 2 } }}>
            <Typography variant="h6" component="p">
              <FormattedMessage id={galleryItemKey(scope, entry.index, 'title')} defaultMessage={entry.item.title} />
            </Typography>
            {entry.item.subtitle?.trim() && (
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                <FormattedMessage
                  id={galleryItemKey(scope, entry.index, 'subtitle')}
                  defaultMessage={entry.item.subtitle}
                />
              </Typography>
            )}
            {count > 1 && (
              <Typography variant="caption" sx={{ opacity: 0.7 }} data-testid="gallery-zoom-counter">
                <FormattedMessage
                  id="page.gallery.lightbox.counter"
                  values={{ position: (index ?? 0) + 1, total: count }}
                />
              </Typography>
            )}
          </Box>

        </Box>
      )}
    </Dialog>
  );
};
