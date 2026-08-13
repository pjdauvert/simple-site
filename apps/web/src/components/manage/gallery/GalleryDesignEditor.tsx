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
  DEFAULT_GALLERY_ITEM_ASPECT_RATIO,
  DEFAULT_GALLERY_ITEM_COLUMNS,
  DEFAULT_GALLERY_ITEM_CORNER_RADIUS,
  DEFAULT_GALLERY_ITEM_FIT,
  DEFAULT_GALLERY_ITEM_SPACING,
  DEFAULT_GALLERY_WATERMARK_COLOR,
  DEFAULT_GALLERY_WATERMARK_OPACITY,
  DEFAULT_GALLERY_WATERMARK_POSITION,
  GALLERY_ITEM_ASPECT_RATIOS,
  GALLERY_ITEM_COLUMNS_MAX,
  GALLERY_ITEM_COLUMNS_MIN,
  GALLERY_ITEM_CORNER_RADIUS_MAX,
  GALLERY_ITEM_FITS,
  GALLERY_ITEM_SPACINGS,
  GALLERY_WATERMARK_POSITIONS,
  GALLERY_WATERMARK_TEXT_MAX_LENGTH,
  GALLERY_ITEM_ELEVATION_MAX,
  GALLERY_ITEM_ELEVATION_STEPS,
  GALLERY_ITEM_MAX_WIDTH_PERCENT_MAX,
  GALLERY_ITEM_MAX_WIDTH_PERCENT_MIN,
  type GalleryCaptionPosition,
  type GalleryDisplayMode,
  type GalleryItemAspectRatio,
  type GalleryItemFit,
  type GalleryItemSpacing,
  type GalleryWatermarkPosition,
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
  setItemAspectRatio,
  setItemBorder,
  setItemBorderColor,
  setItemColumns,
  setItemCornerRadius,
  setItemElevation,
  setItemFit,
  setItemMaxWidthPercent,
  setItemSpacing,
  setWatermark,
} from './galleryDraft';
import { GalleryDesignPreview, type PreviewOrientation } from './GalleryDesignPreview';

/** The column counts the editor offers (the schema's bounds, enumerated). */
const COLUMN_CHOICES = Array.from(
  { length: GALLERY_ITEM_COLUMNS_MAX - GALLERY_ITEM_COLUMNS_MIN + 1 },
  (_, offset) => GALLERY_ITEM_COLUMNS_MIN + offset,
);

/**
 * Design tab of /manage/gallery: how visitors browse the items. Follows the
 * platform's ergonomic principle (docs/contributing.md): only the options
 * APPLICABLE to the selected display mode are shown — caption position in
 * list, columns in the tiled modes, ratio/fit in grid; an inapplicable option
 * is hidden, never disabled, and its stored value survives mode switches. A
 * symbolic skeleton preview (right half, desktop only) illustrates the picked
 * design live, with a landscape/portrait toggle simulating the visitor's
 * screen — a viewing aid that hides no design option, since orientation is
 * the visitor's context, not a design parameter. Saves via
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
  const [itemColumns, setColumns] = useState<number>(DEFAULT_GALLERY_ITEM_COLUMNS);
  const [itemAspectRatio, setAspectRatio] = useState<GalleryItemAspectRatio>(DEFAULT_GALLERY_ITEM_ASPECT_RATIO);
  const [itemFit, setFit] = useState<GalleryItemFit>(DEFAULT_GALLERY_ITEM_FIT);
  const [itemSpacing, setSpacing] = useState<GalleryItemSpacing>(DEFAULT_GALLERY_ITEM_SPACING);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkPosition, setWatermarkPosition] = useState<GalleryWatermarkPosition>(
    DEFAULT_GALLERY_WATERMARK_POSITION,
  );
  const [watermarkColor, setWatermarkColor] = useState(DEFAULT_GALLERY_WATERMARK_COLOR);
  const [watermarkOpacity, setWatermarkOpacity] = useState(DEFAULT_GALLERY_WATERMARK_OPACITY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Preview-only: simulates the visitor's screen, never persisted.
  const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>('landscape');

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
        setColumns(config.gallery?.design?.itemColumns ?? DEFAULT_GALLERY_ITEM_COLUMNS);
        setAspectRatio(config.gallery?.design?.itemAspectRatio ?? DEFAULT_GALLERY_ITEM_ASPECT_RATIO);
        setFit(config.gallery?.design?.itemFit ?? DEFAULT_GALLERY_ITEM_FIT);
        setSpacing(config.gallery?.design?.itemSpacing ?? DEFAULT_GALLERY_ITEM_SPACING);
        setWatermarkText(config.gallery?.design?.watermarkText ?? '');
        setWatermarkPosition(config.gallery?.design?.watermarkPosition ?? DEFAULT_GALLERY_WATERMARK_POSITION);
        setWatermarkColor(config.gallery?.design?.watermarkColor ?? DEFAULT_GALLERY_WATERMARK_COLOR);
        setWatermarkOpacity(config.gallery?.design?.watermarkOpacity ?? DEFAULT_GALLERY_WATERMARK_OPACITY);
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
      merged = setItemSpacing(
        setItemFit(setItemAspectRatio(setItemColumns(merged, itemColumns), itemAspectRatio), itemFit),
        itemSpacing,
      );
      merged = setWatermark(merged, {
        text: watermarkText,
        position: watermarkPosition,
        color: watermarkColor,
        opacity: watermarkOpacity,
      });
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

  /** Columns only mean something where items are tiled. */
  const tiledMode = displayMode === 'grid' || displayMode === 'mosaic';

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

        {/* Ergonomic principle (see docs/contributing.md): an option that does
            not apply to the selected mode is HIDDEN, not disabled. The stored
            values survive mode switches — hiding is presentation only. */}
        {displayMode === 'list' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom id="gallery-caption-position-label">
              <FormattedMessage id="page.manage.gallery.captionPosition" />
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={captionPosition}
              onChange={(_, value: GalleryCaptionPosition | null) => { if (value) setCaption(value); }}
              aria-labelledby="gallery-caption-position-label"
            >
              {GALLERY_CAPTION_POSITIONS.map((position) => (
                <ToggleButton key={position} value={position}>
                  <FormattedMessage id={`page.manage.gallery.captionPosition.${position}`} />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

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
              ) : undefined
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
          {/* Hint outside the field: the narrow input must not squeeze it —
              it spans the settings column like every other option hint. */}
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            <FormattedMessage id="page.manage.gallery.itemMaxWidth.hint" />
          </Typography>
        </Box>

        {tiledMode && (
          <Box>
            <Typography variant="subtitle2" gutterBottom id="gallery-columns-label">
              <FormattedMessage id="page.manage.gallery.columns" />
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={itemColumns}
              onChange={(_, value: number | null) => { if (value) setColumns(value); }}
              aria-labelledby="gallery-columns-label"
            >
              {COLUMN_CHOICES.map((count) => (
                <ToggleButton key={count} value={count}>
                  {count}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              <FormattedMessage id="page.manage.gallery.columns.hint" />
            </Typography>
          </Box>
        )}

        {displayMode === 'grid' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom id="gallery-aspect-ratio-label">
              <FormattedMessage id="page.manage.gallery.aspectRatio" />
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={itemAspectRatio}
              onChange={(_, value: GalleryItemAspectRatio | null) => { if (value) setAspectRatio(value); }}
              aria-labelledby="gallery-aspect-ratio-label"
            >
              {GALLERY_ITEM_ASPECT_RATIOS.map((ratio) => (
                <ToggleButton key={ratio} value={ratio}>
                  {ratio === 'original' ? <FormattedMessage id="page.manage.gallery.aspectRatio.original" /> : ratio}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {itemAspectRatio !== 'original' && (
              <Box sx={{ mt: 1 }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={itemFit}
                  onChange={(_, value: GalleryItemFit | null) => { if (value) setFit(value); }}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.fit' })}
                >
                  {GALLERY_ITEM_FITS.map((fit) => (
                    <ToggleButton key={fit} value={fit}>
                      <FormattedMessage id={`page.manage.gallery.fit.${fit}`} />
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
              <FormattedMessage id="page.manage.gallery.aspectRatio.hint" />
            </Typography>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle2" gutterBottom id="gallery-spacing-label">
            <FormattedMessage id="page.manage.gallery.spacing" />
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={itemSpacing}
            onChange={(_, value: GalleryItemSpacing | null) => { if (value) setSpacing(value); }}
            aria-labelledby="gallery-spacing-label"
          >
            {GALLERY_ITEM_SPACINGS.map((spacing) => (
              <ToggleButton key={spacing} value={spacing}>
                <FormattedMessage id={`page.manage.gallery.spacing.${spacing}`} />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
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
              {/* Only the platform's real shadow steps are offered — every
                  other index of its scale renders flat (see muiTheme). */}
              <Slider
                size="small"
                value={itemElevation}
                onChange={(_, value) => setElevation(value as number)}
                min={0}
                max={GALLERY_ITEM_ELEVATION_MAX}
                step={null}
                marks={GALLERY_ITEM_ELEVATION_STEPS.map((value) => ({ value }))}
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
          <Typography variant="subtitle2" gutterBottom>
            <FormattedMessage id="page.manage.gallery.watermark" />
          </Typography>
          <Stack spacing={2} sx={{ maxWidth: 360 }}>
            <TextField
              size="small"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              label={intl.formatMessage({ id: 'page.manage.gallery.watermark.text' })}
              helperText={<FormattedMessage id="page.manage.gallery.watermark.hint" />}
              slotProps={{ htmlInput: { maxLength: GALLERY_WATERMARK_TEXT_MAX_LENGTH } }}
            />
            {watermarkText.trim() && (
              <>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={watermarkPosition}
                  onChange={(_, value: GalleryWatermarkPosition | null) => { if (value) setWatermarkPosition(value); }}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.watermark.position' })}
                >
                  {GALLERY_WATERMARK_POSITIONS.map((position) => (
                    <ToggleButton key={position} value={position}>
                      <FormattedMessage id={`page.manage.gallery.watermark.position.${position}`} />
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <ColorField
                  label={intl.formatMessage({ id: 'page.manage.gallery.watermark.color' })}
                  value={watermarkColor}
                  onChange={setWatermarkColor}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage id="page.manage.gallery.watermark.opacity" />
                  </Typography>
                  <Slider
                    size="small"
                    value={watermarkOpacity}
                    onChange={(_, value) => setWatermarkOpacity(value as number)}
                    min={10}
                    max={100}
                    step={5}
                    valueLabelDisplay="auto"
                    aria-label={intl.formatMessage({ id: 'page.manage.gallery.watermark.opacity' })}
                  />
                </Box>
              </>
            )}
          </Stack>
        </Box>

        <Box>
          <Button variant="contained" onClick={handleSave} disabled={submitting || widthInvalid}>
            {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.gallery.save" />}
          </Button>
        </Box>
      </Stack>

      {/* Symbolic preview of the picked design — right half, desktop only.
          The settings column is long, so the preview sticks under the fixed
          admin AppBar (64 px) and stays in view while the form scrolls; a
          taller skeleton scrolls inside its own box rather than overflowing. */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: { xs: 'none', md: 'block' },
          position: 'sticky',
          top: 88,
          alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 112px)',
          overflowY: 'auto',
        }}
      >
        <GalleryDesignPreview
          displayMode={displayMode}
          captionPosition={captionPosition}
          itemElevation={itemElevation}
          itemBorder={itemBorder}
          itemBorderColor={itemBorderColor}
          itemCornerRadius={itemCornerRadius}
          itemColumns={itemColumns}
          itemAspectRatio={itemAspectRatio}
          itemFit={itemFit}
          itemSpacing={itemSpacing}
          orientation={previewOrientation}
          onOrientationChange={setPreviewOrientation}
        />
      </Box>
    </Box>
  );
};
