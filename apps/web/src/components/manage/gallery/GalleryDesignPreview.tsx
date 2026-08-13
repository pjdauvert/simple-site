import { Box, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import type { SxProps, Theme } from '@mui/material/styles';
import type {
  GalleryCaptionPosition,
  GalleryDisplayMode,
  GalleryItemAspectRatio,
  GalleryItemFit,
  GalleryItemSpacing,
} from '@simple-site/interfaces';
import {
  GALLERY_SPACING_UNITS,
  GALLERY_STACK_SPACING_UNITS,
  galleryAspectRatioValue,
  itemFrameSx,
  type GalleryItemFrame,
} from '../../../pages/gallery/galleryDisplay';

interface GalleryDesignPreviewProps extends GalleryItemFrame {
  displayMode: GalleryDisplayMode;
  captionPosition: GalleryCaptionPosition;
  itemColumns: number;
  itemAspectRatio: GalleryItemAspectRatio;
  itemFit: GalleryItemFit;
  itemSpacing: GalleryItemSpacing;
}

/**
 * Symbolic skeleton of the public gallery under the picked design — a preview
 * to help the admin choose: solid rectangles stand for the images, solid bars
 * for the title/subtitle text lines. It mirrors the real rendering rules:
 * caption placement applies in list mode only, grid always captions below,
 * mosaic tiles carry no caption at all, the alternation places captions itself
 * in alternate mode, and the frame options (elevation / border / corners) are
 * applied to the image rectangles through the exact `itemFrameSx` the public
 * views use. Purely decorative (aria-hidden); the parent hides it on mobile.
 */
export const GalleryDesignPreview: React.FC<GalleryDesignPreviewProps> = ({
  displayMode,
  captionPosition,
  itemElevation,
  itemBorder,
  itemBorderColor,
  itemCornerRadius,
  itemColumns,
  itemAspectRatio,
  itemFit,
  itemSpacing,
}) => {
  const captionFirst = captionPosition === 'above' || captionPosition === 'left';
  const sideCaption = captionPosition === 'left' || captionPosition === 'right';
  const frame = itemFrameSx({ itemElevation, itemBorder, itemBorderColor, itemCornerRadius });
  // The skeleton is a scaled-down page: the same spacing steps read as
  // proportionally tighter/airier gaps here.
  const gap = GALLERY_SPACING_UNITS[itemSpacing].md / 2;
  const stackGap = GALLERY_STACK_SPACING_UNITS[itemSpacing].md / 3;
  const aspectRatio = galleryAspectRatioValue(itemAspectRatio);

  /** A solid rectangle standing for an image, framed like the real tiles. */
  const imageBlock = (sx: SxProps<Theme>): React.ReactNode => (
    <Box key="image" sx={{ bgcolor: 'action.selected', flexShrink: 0, ...frame, ...sx }} />
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
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${itemColumns}, 1fr)`, gap }}>
          {Array.from({ length: itemColumns * 2 }, (_, i) => (
            <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              {/* `contain` leaves the cell partly empty — shown as an inset
                  rectangle, like the real letterboxing. */}
              {aspectRatio
                ? imageBlock({
                    width: itemFit === 'contain' ? '78%' : '100%',
                    aspectRatio,
                    ...(itemFit === 'contain' ? { mx: 'auto' } : {}),
                  })
                : imageBlock({ width: '100%', height: 44 })}
              {textBars(Math.max(24, Math.round(120 / itemColumns)))}
            </Box>
          ))}
        </Box>
      );
    }
    if (displayMode === 'mosaic') {
      // Masonry columns of natural (varied) height tiles — images only, no
      // caption bars, like the real rendering.
      // Varied heights, cycled so any column count keeps a masonry look.
      const heightCycle = [52, 84, 92, 44, 64, 72, 60, 88, 48, 76];
      const columns = Array.from({ length: itemColumns }, (_, col) => [
        heightCycle[(col * 2) % heightCycle.length],
        heightCycle[(col * 2 + 1) % heightCycle.length],
      ]);
      return (
        <Box sx={{ display: 'flex', gap, alignItems: 'flex-start' }}>
          {columns.map((heights, col) => (
            <Box key={col} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: stackGap }}>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: stackGap, alignItems: 'center' }}>
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
