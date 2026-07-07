import { useEffect, useState } from 'react';
import { Box, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import { HideImageOutlined as HideImageIcon, PhotoLibrary as PhotoLibraryIcon } from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { ImagePickerDialog } from './ImagePickerDialog';

interface MediaUrlFieldProps {
  label: string;
  /** Current URL or path (absolute `https://…` or relative `/logo.svg`). */
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: React.ReactNode;
  fullWidth?: boolean;
  /**
   * When `true`, a "choose from library" icon button is shown as the field's end
   * adornment and opens the media picker. The caller decides whether to enable it
   * (e.g. behind the `media` feature flag) — this component stays flag-agnostic.
   */
  enablePicker?: boolean;
}

/** Fixed height of the preview zone; images taller than this scale down to fit. */
const PREVIEW_HEIGHT = 100;

/**
 * A URL/path text field for an image, with an optional media-library picker
 * (end-adornment button) and a live preview thumbnail underneath.
 *
 * The preview zone keeps a fixed height: images up to {@link PREVIEW_HEIGHT}px are
 * shown at their natural size, top-left; taller ones scale down. A placeholder is
 * shown when the value is empty or the image fails to load (e.g. a 404). Relative
 * paths resolve against the current origin, so `/logo.svg` previews just like a
 * full URL.
 */
export const MediaUrlField: React.FC<MediaUrlFieldProps> = ({
  label,
  value,
  onChange,
  error,
  helperText,
  fullWidth,
  enablePicker = false,
}) => {
  const intl = useIntl();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const trimmed = value.trim();
  // A new value gets a fresh chance to load — clear any previous load failure.
  useEffect(() => { setImageError(false); }, [trimmed]);

  const showImage = trimmed.length > 0 && !imageError;
  const pickerLabel = intl.formatMessage({ id: 'page.manage.site.chooseFromLibrary' });

  return (
    <Box sx={fullWidth ? { width: '100%' } : undefined}>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        helperText={helperText}
        fullWidth={fullWidth}
        slotProps={enablePicker ? {
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={pickerLabel}>
                  <IconButton edge="end" onClick={() => setPickerOpen(true)} aria-label={pickerLabel}>
                    <PhotoLibraryIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        } : undefined}
      />

      <Box
        sx={{
          height: PREVIEW_HEIGHT,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        {showImage ? (
          <Box
            component="img"
            src={trimmed}
            alt={intl.formatMessage({ id: 'page.manage.site.preview.alt' })}
            onError={() => setImageError(true)}
            sx={{ display: 'block', maxHeight: '100%', maxWidth: '100%' }}
          />
        ) : (
          <Box
            aria-label={intl.formatMessage({ id: 'page.manage.site.preview.empty' })}
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
            }}
          >
            <HideImageIcon />
          </Box>
        )}
      </Box>

      {enablePicker && (
        <ImagePickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => onChange(url)}
        />
      )}
    </Box>
  );
};
