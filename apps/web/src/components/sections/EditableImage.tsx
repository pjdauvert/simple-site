import { Box, ButtonBase, Typography } from '@mui/material';
import {
  AddPhotoAlternateOutlined as AddPhotoIcon,
  PhotoLibraryOutlined as PhotoLibraryIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import type { SxProps, Theme } from '@mui/material/styles';
import { useSectionEdit } from './sectionEdit';

interface EditableImageProps {
  /** Dotted path within the section's `design`, e.g. `artwork.imageUrl`. */
  designPath: string;
  src?: string;
  alt?: string;
  sx?: SxProps<Theme>;
  style?: React.CSSProperties;
}

/**
 * An image slot declared by a section renderer.
 *
 * - **Public site**: renders the `<img>` exactly as before, and nothing at all
 *   when there is no image.
 * - **Admin, section selected**: clicking the image (or the placeholder, when
 *   empty) opens the media library and writes the chosen URL back to `designPath`.
 */
export const EditableImage: React.FC<EditableImageProps> = ({ designPath, src, alt, sx, style }) => {
  const edit = useSectionEdit();
  const intl = useIntl();

  if (!edit) {
    if (!src) return null;
    return <Box component="img" src={src} alt={alt ?? ''} style={style} sx={sx} />;
  }

  if (!src) {
    return (
      <ButtonBase
        onClick={() => edit.pickImageAt(designPath)}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 3,
          minWidth: 160,
          minHeight: 120,
          width: '100%',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          color: 'text.secondary',
          '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
        }}
      >
        <AddPhotoIcon />
        <Typography variant="caption">
          {intl.formatMessage({ id: 'page.manage.pages.inline.addImage' })}
        </Typography>
      </ButtonBase>
    );
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-block', '&:hover .image-overlay': { opacity: 1 } }}>
      <Box component="img" src={src} alt={alt ?? ''} style={style} sx={sx} />
      <ButtonBase
        className="image-overlay"
        onClick={() => edit.pickImageAt(designPath)}
        sx={{
          position: 'absolute',
          inset: 0,
          gap: 1,
          opacity: 0,
          transition: 'opacity 120ms',
          bgcolor: 'rgba(0,0,0,0.5)',
          color: '#fff',
          borderRadius: 1,
        }}
      >
        <PhotoLibraryIcon fontSize="small" />
        <Typography variant="caption">
          {intl.formatMessage({ id: 'page.manage.pages.inline.changeImage' })}
        </Typography>
      </ButtonBase>
    </Box>
  );
};
