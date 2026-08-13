import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  InputAdornment,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  DEFAULT_GALLERY_CAPTION_POSITION,
  DEFAULT_GALLERY_DISPLAY_MODE,
  GALLERY_CAPTION_POSITIONS,
  GALLERY_DISPLAY_MODES,
  DEFAULT_GALLERY_ITEM_CORNER_RADIUS,
  GALLERY_ITEM_CORNER_RADIUS_MAX,
  GALLERY_ITEM_ELEVATION_MAX,
  GALLERY_ITEM_MAX_WIDTH_PERCENT_MAX,
  GALLERY_ITEM_MAX_WIDTH_PERCENT_MIN,
  type GalleryCaptionPosition,
  type GalleryDisplayMode,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';
import { useNotifications } from '../../../hooks/useNotifications';
import { ColorField } from '../themes/ColorField';
import {
  emptyGallery,
  setCaptionPosition,
  setDisplayMode,
  setItemBorder,
  setItemBorderColor,
  setItemCornerRadius,
  setItemElevation,
  setItemMaxWidthPercent,
} from './galleryDraft';
import { GalleryDesignPreview } from './GalleryDesignPreview';

/**
 * Design tab of /manage/gallery: how visitors browse the items — the display
 * mode (centered list, card grid, mosaic, or team-style alternating rows) and
 * the caption position around each image. The caption position applies to the
 * LIST mode only, so the toggle is disabled elsewhere with a per-mode hint:
 * grid always captions below, mosaic shows no caption at all, and alternate's
 * alternation places the caption itself. A symbolic skeleton preview (right
 * half, desktop only) illustrates the picked design live. Saves via
 * `PUT /api/config/gallery`, re-reading the draft first so the Themes tab's
 * items are never clobbered; defaults are stored as "no design" to keep
 * configs minimal.
 */
export const GalleryDesignEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [captionPosition, setCaption] = useState<GalleryCaptionPosition | null>(null);
  const [displayMode, setMode] = useState<GalleryDisplayMode>(DEFAULT_GALLERY_DISPLAY_MODE);
  // Empty field = no cap (the default) — kept as undefined, never 0.
  const [itemMaxWidthPercent, setWidth] = useState<number | undefined>(undefined);
  const [itemElevation, setElevation] = useState(0);
  const [itemBorder, setBorderOn] = useState(false);
  const [itemBorderColor, setBorderColor] = useState('');
  const [itemCornerRadius, setCornerRadius] = useState(DEFAULT_GALLERY_ITEM_CORNER_RADIUS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setCaption(config.gallery?.design?.captionPosition ?? DEFAULT_GALLERY_CAPTION_POSITION);
        setMode(config.gallery?.design?.displayMode ?? DEFAULT_GALLERY_DISPLAY_MODE);
        setWidth(config.gallery?.design?.itemMaxWidthPercent);
        setElevation(config.gallery?.design?.itemElevation ?? 0);
        setBorderOn(config.gallery?.design?.itemBorder ?? false);
        setBorderColor(config.gallery?.design?.itemBorderColor ?? '');
        setCornerRadius(config.gallery?.design?.itemCornerRadius ?? DEFAULT_GALLERY_ITEM_CORNER_RADIUS);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.gallery.error.load' }));
      });
    return () => { active = false; };
  }, [intl]);

  const widthInvalid =
    itemMaxWidthPercent !== undefined &&
    (!Number.isInteger(itemMaxWidthPercent) ||
      itemMaxWidthPercent < GALLERY_ITEM_MAX_WIDTH_PERCENT_MIN ||
      itemMaxWidthPercent > GALLERY_ITEM_MAX_WIDTH_PERCENT_MAX);

  const handleSave = async (): Promise<void> => {
    if (captionPosition === null || widthInvalid) return;
    setSubmitting(true);
    try {
      // Merge over the freshest draft so the Themes tab's items survive.
      const fresh = (await loadDraftConfig()).gallery ?? emptyGallery();
      let merged = setItemMaxWidthPercent(
        setDisplayMode(setCaptionPosition(fresh, captionPosition), displayMode),
        itemMaxWidthPercent,
      );
      merged = setItemCornerRadius(
        setItemBorderColor(setItemBorder(setItemElevation(merged, itemElevation), itemBorder), itemBorderColor),
        itemCornerRadius,
      );
      await updateGallery(merged);
      notify.success(intl.formatMessage({ id: 'page.manage.gallery.saved' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.gallery.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }
  if (captionPosition === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader variant="triskelion" size={48} /></Box>;
  }

  // The caption position is a LIST-mode setting; other modes place (or drop)
  // the caption themselves and explain it under the disabled toggle.
  const captionApplies = displayMode === 'list';
  const captionHintId: string | null =
    displayMode === 'grid'
      ? 'page.manage.gallery.captionPosition.gridHint'
      : displayMode === 'mosaic'
        ? 'page.manage.gallery.captionPosition.mosaicHint'
        : displayMode === 'alternate'
          ? 'page.manage.gallery.captionPosition.alternateHint'
          : null;

  return (
    <Box sx={{ display: 'flex', gap: { md: 4, lg: 6 }, alignItems: 'flex-start', maxWidth: 1100 }}>
      <Stack spacing={4} sx={{ flex: 1, minWidth: 0 }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom id="gallery-display-mode-label">
            <FormattedMessage id="page.manage.gallery.displayMode" />
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={displayMode}
            onChange={(_, value: GalleryDisplayMode | null) => { if (value) setMode(value); }}
            aria-labelledby="gallery-display-mode-label"
          >
            {GALLERY_DISPLAY_MODES.map((mode) => (
              <ToggleButton key={mode} value={mode}>
                <FormattedMessage id={`page.manage.gallery.displayMode.${mode}`} />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            <FormattedMessage id="page.manage.gallery.displayMode.hint" />
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom id="gallery-caption-position-label">
            <FormattedMessage id="page.manage.gallery.captionPosition" />
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={captionPosition}
            disabled={!captionApplies}
            onChange={(_, value: GalleryCaptionPosition | null) => { if (value) setCaption(value); }}
            aria-labelledby="gallery-caption-position-label"
          >
            {GALLERY_CAPTION_POSITIONS.map((position) => (
              <ToggleButton key={position} value={position}>
                <FormattedMessage id={`page.manage.gallery.captionPosition.${position}`} />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {captionHintId && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              <FormattedMessage id={captionHintId} />
            </Typography>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            <FormattedMessage id="page.manage.gallery.itemMaxWidth" />
          </Typography>
          <TextField
            size="small"
            type="number"
            value={itemMaxWidthPercent ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              setWidth(raw === '' ? undefined : Number(raw));
            }}
            error={widthInvalid}
            helperText={
              widthInvalid ? (
                <FormattedMessage
                  id="page.manage.gallery.itemMaxWidth.range"
                  values={{ min: GALLERY_ITEM_MAX_WIDTH_PERCENT_MIN, max: GALLERY_ITEM_MAX_WIDTH_PERCENT_MAX }}
                />
              ) : (
                <FormattedMessage id="page.manage.gallery.itemMaxWidth.hint" />
              )
            }
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
              htmlInput: {
                min: GALLERY_ITEM_MAX_WIDTH_PERCENT_MIN,
                max: GALLERY_ITEM_MAX_WIDTH_PERCENT_MAX,
                step: 5,
                'aria-label': intl.formatMessage({ id: 'page.manage.gallery.itemMaxWidth' }),
              },
            }}
            sx={{ maxWidth: 220 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            <FormattedMessage id="page.manage.gallery.frame" />
          </Typography>
          <Stack spacing={2} sx={{ maxWidth: 360 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" id="gallery-item-elevation-label">
                <FormattedMessage id="page.manage.gallery.frame.elevation" />
              </Typography>
              <Slider
                size="small"
                value={itemElevation}
                onChange={(_, value) => setElevation(value as number)}
                min={0}
                max={GALLERY_ITEM_ELEVATION_MAX}
                valueLabelDisplay="auto"
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.frame.elevation' })}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" id="gallery-item-radius-label">
                <FormattedMessage id="page.manage.gallery.frame.cornerRadius" />
              </Typography>
              <Slider
                size="small"
                value={itemCornerRadius}
                onChange={(_, value) => setCornerRadius(value as number)}
                min={0}
                max={GALLERY_ITEM_CORNER_RADIUS_MAX}
                valueLabelDisplay="auto"
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.frame.cornerRadius' })}
              />
            </Box>
            <FormControlLabel
              control={<Switch checked={itemBorder} onChange={(_, checked) => setBorderOn(checked)} />}
              label={<FormattedMessage id="page.manage.gallery.frame.border" />}
            />
            {itemBorder && (
              <ColorField
                label={intl.formatMessage({ id: 'page.manage.gallery.frame.borderColor' })}
                value={itemBorderColor}
                onChange={setBorderColor}
                helperText={<FormattedMessage id="page.manage.gallery.frame.borderColor.hint" />}
              />
            )}
          </Stack>
        </Box>

        <Box>
          <Button variant="contained" onClick={handleSave} disabled={submitting || widthInvalid}>
            {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.gallery.save" />}
          </Button>
        </Box>
      </Stack>

      {/* Symbolic preview of the picked design — right half, desktop only. */}
      <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', md: 'block' } }}>
        <GalleryDesignPreview
          displayMode={displayMode}
          captionPosition={captionPosition}
          itemElevation={itemElevation}
          itemBorder={itemBorder}
          itemBorderColor={itemBorderColor}
          itemCornerRadius={itemCornerRadius}
        />
      </Box>
    </Box>
  );
};
