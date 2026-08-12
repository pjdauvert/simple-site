import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { GalleryItem } from '@simple-site/interfaces';
import { MediaUrlField } from '../../media/MediaUrlField';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';

interface GalleryItemDialogProps {
  open: boolean;
  /** The item being edited, or null when adding a new one. */
  initial: GalleryItem | null;
  onCancel: () => void;
  onConfirm: (item: GalleryItem) => void;
}

/**
 * Add/edit dialog of one gallery item: the image (picked from the media library
 * when that feature is on), the required title and the optional subtitle. Title
 * and subtitle are translation DEFAULTS — per-language values live on the
 * Translations page. An item saved without an image is kept in the config but
 * not displayed publicly; the editor row flags it.
 */
export const GalleryItemDialog: React.FC<GalleryItemDialogProps> = ({ open, initial, onCancel, onConfirm }) => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  // Re-seed the fields each time the dialog opens on a different item.
  useEffect(() => {
    if (!open) return;
    setImageUrl(initial?.imageUrl ?? '');
    setTitle(initial?.title ?? '');
    setSubtitle(initial?.subtitle ?? '');
  }, [open, initial]);

  const handleConfirm = (): void => {
    if (!title.trim()) return;
    onConfirm({
      ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      title: title.trim(),
      ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
    });
  };

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
          />
          <TextField
            label={intl.formatMessage({ id: 'page.manage.gallery.dialog.subtitle' })}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
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
