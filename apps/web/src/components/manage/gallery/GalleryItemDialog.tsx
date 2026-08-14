import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryItemKey, type GalleryItem, type GalleryTag } from '@simple-site/interfaces';
import { MediaUrlField } from '../../media/MediaUrlField';
import { TranslateShortcut } from '../TranslateShortcut';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';

interface GalleryItemDialogProps {
  open: boolean;
  /** The item being edited, or null when adding a new one. */
  initial: GalleryItem | null;
  /** The gallery's declared tags, in gallery order. */
  tags: readonly GalleryTag[];
  /** Config index of an EXISTING item — enables the Translate shortcuts. */
  itemIndex?: number;
  onCancel: () => void;
  onConfirm: (item: GalleryItem) => void;
  /** Present only when editing — removes the item from the gallery. */
  onDelete?: () => void;
}

/**
 * Attributes dialog of one gallery item, opened by clicking its thumbnail (or
 * the Add button): the image (picked from the media library when that feature
 * is on), the required title, the optional subtitle — both translation
 * DEFAULTS, with Translate shortcuts once the item exists — and the item's
 * TAGS (any number of the gallery's declared tags; a tagged item appears in
 * each tag's collection page). An item saved without an image is kept in the
 * config but not displayed publicly; the thumbnail flags it.
 */
export const GalleryItemDialog: React.FC<GalleryItemDialogProps> = ({
  open,
  initial,
  tags,
  itemIndex,
  onCancel,
  onConfirm,
  onDelete,
}) => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [itemTags, setItemTags] = useState<string[]>([]);

  // Re-seed the fields each time the dialog opens on a different item.
  useEffect(() => {
    if (!open) return;
    setImageUrl(initial?.imageUrl ?? '');
    setTitle(initial?.title ?? '');
    setSubtitle(initial?.subtitle ?? '');
    setItemTags(initial?.tags ?? []);
  }, [open, initial]);

  const handleConfirm = (): void => {
    if (!title.trim()) return;
    onConfirm({
      ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
      title: title.trim(),
      ...(subtitle.trim() ? { subtitle: subtitle.trim() } : {}),
      // Normalized to the declared order, so the stored config stays stable.
      tags: tags.map((tag) => tag.tag).filter((tag) => itemTags.includes(tag)),
    });
  };

  const translateAdornment = (field: 'title' | 'subtitle') =>
    itemIndex !== undefined
      ? {
          endAdornment: (
            <InputAdornment position="end">
              <TranslateShortcut
                i18nKey={galleryItemKey(itemIndex, field)}
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
          {/* Tags only exist once declared on the Tags side — no inline creation. */}
          {tags.length > 0 && (
            <TextField
              select
              label={intl.formatMessage({ id: 'page.manage.gallery.dialog.tags' })}
              value={itemTags}
              onChange={(e) => setItemTags(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
              fullWidth
              slotProps={{
                select: {
                  multiple: true,
                  renderValue: (selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((tag) => (
                        <Chip key={tag} size="small" label={tag} />
                      ))}
                    </Box>
                  ),
                },
              }}
            >
              {tags.map((tag) => (
                <MenuItem key={tag.tag} value={tag.tag}>
                  <Checkbox size="small" checked={itemTags.includes(tag.tag)} sx={{ py: 0, pl: 0 }} />
                  <ListItemText primary={tag.displayName} secondary={tag.tag} />
                </MenuItem>
              ))}
            </TextField>
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
