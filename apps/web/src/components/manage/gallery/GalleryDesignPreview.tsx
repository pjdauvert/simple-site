import { Box, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { SxProps, Theme } from '@mui/material/styles';
import type { GalleryCaptionPosition, GalleryDisplayMode } from '@simple-site/interfaces';

interface GalleryDesignPreviewProps {
  displayMode: GalleryDisplayMode;
  captionPosition: GalleryCaptionPosition;
}

/**
 * Symbolic skeleton of the public gallery under the picked design — a preview
 * to help the admin choose: solid rectangles stand for the images, solid bars
 * for the title/subtitle text lines. It mirrors the real rendering rules:
 * caption placement applies in list mode only, grid always captions below,
 * mosaic tiles carry no caption at all, and the alternation places captions
 * itself in alternate mode. Purely decorative (aria-hidden); the parent hides
 * it on mobile.
 */
export const GalleryDesignPreview: React.FC<GalleryDesignPreviewProps> = ({ displayMode, captionPosition }) => {
  const captionFirst = captionPosition === 'above' || captionPosition === 'left';
  const sideCaption = captionPosition === 'left' || captionPosition === 'right';

  /** A solid rectangle standing for an image. */
  const imageBlock = (sx: SxProps<Theme>): React.ReactNode => (
    <Box key="image" sx={{ bgcolor: 'action.selected', borderRadius: 0.5, flexShrink: 0, ...sx }} />
  );

  /** Two solid bars standing for the title and subtitle text lines. */
  const textBars = (width: number, sx?: SxProps<Theme>): React.ReactNode => (
    <Box key="caption" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, ...sx }}>
      <Box sx={{ height: 7, width, borderRadius: 4, bgcolor: 'text.secondary' }} />
      <Box sx={{ height: 5, width: Math.round(width * 0.6), borderRadius: 4, bgcolor: 'text.disabled' }} />
    </Box>
  );

  /** One list tile honouring the caption placement (list mode only). */
  const tile = (imageSx: SxProps<Theme>, barsWidth: number): React.ReactNode => {
    const image = imageBlock(imageSx);
    const bars = textBars(barsWidth, sideCaption ? { justifyContent: 'center' } : undefined);
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: sideCaption ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {captionFirst ? [bars, image] : [image, bars]}
      </Box>
    );
  };

  const skeleton = (): React.ReactNode => {
    if (displayMode === 'grid') {
      // Grid cells always caption below the image.
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              {imageBlock({ width: '100%', height: 44 })}
              {textBars(40)}
            </Box>
          ))}
        </Box>
      );
    }
    if (displayMode === 'mosaic') {
      // Masonry columns of natural (varied) height tiles — images only, no
      // caption bars, like the real rendering.
      const columns: number[][] = [
        [52, 84],
        [92, 44],
        [64, 72],
      ];
      return (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          {columns.map((heights, col) => (
            <Box key={col} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {heights.map((height, i) => (
                <Box key={i}>{imageBlock({ width: '100%', height })}</Box>
              ))}
            </Box>
          ))}
        </Box>
      );
    }
    if (displayMode === 'alternate') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {[false, true, false].map((reversed, i) => (
            <Box
              key={i}
              sx={{ display: 'flex', flexDirection: reversed ? 'row-reverse' : 'row', alignItems: 'center', gap: 2 }}
            >
              {imageBlock({ width: '58%', height: 56 })}
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{textBars(64)}</Box>
            </Box>
          ))}
        </Box>
      );
    }
    // list (default): centered shots stacked vertically (landscape rectangles —
    // fixed sizes: percentages don't resolve in a content-sized flex parent).
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
        {[0, 1].map((i) => (
          <Box key={i} sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {tile({ width: 200, height: 96 }, 72)}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        <FormattedMessage id="page.manage.gallery.preview" />
      </Typography>
      <Box
        aria-hidden
        data-testid={`gallery-preview-${displayMode}`}
        sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2.5, minHeight: 300 }}
      >
        {skeleton()}
      </Box>
    </Box>
  );
};
