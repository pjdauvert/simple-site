import React, { useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryItemKey, type GalleryCaptionPosition } from '@simple-site/interfaces';
import type { DisplayableGalleryItem } from './galleryDisplay';
import { GalleryLightbox } from './GalleryLightbox';

interface GalleryItemListProps {
  /** Displayable entries (image present), with their config positions for i18n. */
  entries: DisplayableGalleryItem[];
  /** i18n scope of the list (`gallery` or `gallery.theme.<themeId>`). */
  scope: string;
  captionPosition: GalleryCaptionPosition;
}

/**
 * The list view of a gallery: centered shots, each captioned by its title and
 * optional subtitle placed above/below/left/right per the design settings
 * (side captions stack on mobile — left falls back to above, right to below).
 * Clicking a shot opens the zoom carousel over the same list. An image that
 * fails to load drops its whole item, matching the missing-image rule.
 */
export const GalleryItemList: React.FC<GalleryItemListProps> = ({ entries, scope, captionPosition }) => {
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

  return (
    <>
      <Stack spacing={{ xs: 6, md: 8 }}>
        {visible.map(({ item, index }, visibleIndex) => {
          const caption = (
            <Box
              key="caption"
              sx={{ textAlign: 'center', maxWidth: sideCaption ? { md: 280 } : undefined, flexShrink: 0 }}
            >
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
          const image = (
            <ButtonBase
              key="image"
              onClick={() => setZoomIndex(visibleIndex)}
              focusRipple
              sx={{ display: 'block', maxWidth: '100%', cursor: 'zoom-in', borderRadius: 1, overflow: 'hidden' }}
            >
              <Box
                component="img"
                src={item.imageUrl}
                alt={intl.formatMessage({ id: galleryItemKey(scope, index, 'title'), defaultMessage: item.title })}
                onError={() => markFailed(item.imageUrl)}
                sx={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: { xs: '60vh', md: '70vh' },
                  width: 'auto',
                  height: 'auto',
                }}
              />
            </ButtonBase>
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
              {captionFirst ? [caption, image] : [image, caption]}
            </Box>
          );
        })}
      </Stack>
      <GalleryLightbox
        entries={visible}
        scope={scope}
        index={zoomIndex}
        onClose={() => setZoomIndex(null)}
        onNavigate={setZoomIndex}
      />
    </>
  );
};
