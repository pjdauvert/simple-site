import React from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryItemKey } from '@simple-site/interfaces';
import type { DisplayableGalleryItem } from './galleryDisplay';

interface GalleryLightboxProps {
  /** The displayable entries being browsed (a theme's list or the root list). */
  entries: DisplayableGalleryItem[];
  /** i18n scope of the list (`gallery` or `gallery.theme.<themeId>`). */
  scope: string;
  /** Position in `entries` of the zoomed item, or null when closed. */
  index: number | null;
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

/**
 * Zoom mode: the clicked image maximised to what the screen can offer (contained,
 * never cropped) with its title/subtitle kept visible underneath, and left/right
 * arrows to keep browsing the same list as a wrap-around carousel. Escape or the
 * close button returns to the list; the keyboard arrows navigate too.
 */
export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({ entries, scope, index, onClose, onNavigate }) => {
  const intl = useIntl();
  const entry = index !== null ? entries[index] : undefined;
  const count = entries.length;
  const goTo = (offset: number): void => {
    if (index === null || count < 2) return;
    onNavigate((index + offset + count) % count);
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
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <IconButton
            onClick={onClose}
            aria-label={intl.formatMessage({ id: 'page.gallery.lightbox.close' })}
            sx={{ ...controlSx, position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          >
            <CloseIcon />
          </IconButton>

          <Box
            component="img"
            src={entry.item.imageUrl}
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
          </Box>
        </Box>
      )}
    </Dialog>
  );
};
