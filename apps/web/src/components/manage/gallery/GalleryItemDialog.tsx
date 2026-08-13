import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryItemKey, type GalleryItem } from '@simple-site/interfaces';
import { MediaUrlField } from '../../media/MediaUrlField';
import { TranslateShortcut } from '../TranslateShortcut';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';

/** The location select encodes "no theme" (the gallery root) as this value. */
const ROOT_VALUE = 'root';

interface GalleryItemDialogProps {
  open: boolean;
  /** The item being edited, or null when adding a new one. */
  initial: GalleryItem | null;
  /** Theme options of the location select, in gallery order. */
  themes: readonly { themeId: string; title: string }[];
  /** The list the item currently sits in (edit) or is added to: theme index or null (root). */
  location: number | null;
  /** i18n scope + config index of an EXISTING item — enables the Translate shortcuts. */
  i18n?: { scope: string; index: number };
  onCancel: () => void;
  /** `target` is the chosen list — differs from `location` when the item was moved. */
  onConfirm: (item: GalleryItem, target: number | null) => void;
  /** Present only when editing — deletes the item. */
  onDelete?: () => void;
  /**
   * Cover controls, present only when editing an item that sits in a theme
   * (the root list has no cover). `isCover` drives the toggle's state.
   */
  cover?: { isCover: boolean; onToggle: (isCover: boolean) => void };
}

/**
 * Attributes dialog of one gallery item, opened by clicking its thumbnail (or
 * an Add button): the image (picked from the media library when that feature
 * is on), the required title, the optional subtitle — both translation
 * DEFAULTS, with Translate shortcuts once the item exists — and the theme the
 * item belongs to (changing it moves the item to the end of that list). An
 * item saved without an image is kept in the config but not displayed
 * publicly; the thumbnail flags it.
 */
export const GalleryItemDialog: React.FC<GalleryItemDialogProps> = ({
  open,
  initial,
  themes,
  location,
  i18n,
  onCancel,
  onConfirm,
  onDelete,
  cover,
}) => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [target, setTarget] = useState<string>(ROOT_VALUE);

  // Re-seed the fields each time the dialog opens on a different item.
  useEffect(() => {
    if (!open) return;
    setImageUrl(initial?.imageUrl ?? '');
    setTitle(initial?.title ?? '');
    setSubtitle(initial?.subtitle ?? '');
    setTarget(location === null ? ROOT_VALUE : String(location));
  }, [open, initial, location]);

  const handleConfirm = (): void => {
    if (!title.trim()) return;
    onConfirm(
      {
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        title: title.trim(),
        ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
      },
      target === ROOT_VALUE ? null : Number(target),
    );
  };

  const translateAdornment = (field: 'title' | 'subtitle') =>
    i18n
      ? {
          endAdornment: (
            <InputAdornment position="end">
              <TranslateShortcut
                i18nKey={galleryItemKey(i18n.scope, i18n.index, field)}
                label={intl.formatMessage({ id: 'page.manage.gallery.translate' })}
              />
            </InputAdornment>
          ),
        }
      : undefined;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>
        <FormattedMessage id={initial ? 'page.manage.gallery.dialog.editTitle' : 'page.manage.gallery.dialog.addTitle'} />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MediaUrlField
            label={intl.formatMessage({ id: 'page.manage.gallery.dialog.image' })}
            value={imageUrl}
            onChange={setImageUrl}
            enablePicker={Boolean(flags?.media)}
            fullWidth
          />
          <TextField
            label={intl.formatMessage({ id: 'page.manage.gallery.dialog.title' })}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            slotProps={{ input: translateAdornment('title') }}
          />
          <TextField
            label={intl.formatMessage({ id: 'page.manage.gallery.dialog.subtitle' })}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            fullWidth
            slotProps={{ input: translateAdornment('subtitle') }}
          />
          <TextField
            select
            label={intl.formatMessage({ id: 'page.manage.gallery.dialog.theme' })}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            fullWidth
          >
            <MenuItem value={ROOT_VALUE}>
              <FormattedMessage id="page.manage.gallery.dialog.noTheme" />
            </MenuItem>
            {themes.map((theme, index) => (
              <MenuItem key={theme.themeId} value={String(index)}>
                {theme.title}
              </MenuItem>
            ))}
          </TextField>
          {/* Only a themed item can represent its theme on the gallery index. */}
          {cover && (
            <FormControlLabel
              control={
                <Switch checked={cover.isCover} onChange={(_, checked) => cover.onToggle(checked)} />
              }
              label={<FormattedMessage id="page.manage.gallery.dialog.cover" />}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {onDelete && (
          <>
            <Button color="error" onClick={onDelete}>
              <FormattedMessage id="page.manage.gallery.item.delete" />
            </Button>
            <Box sx={{ flex: 1 }} />
          </>
        )}
        <Button onClick={onCancel}>
          <FormattedMessage id="page.manage.gallery.dialog.cancel" />
        </Button>
        <Button variant="contained" disabled={!title.trim()} onClick={handleConfirm}>
          <FormattedMessage id="page.manage.gallery.dialog.confirm" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};
