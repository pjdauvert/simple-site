import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronLeft as EarlierIcon,
  ChevronRight as LaterIcon,
  HideImageOutlined as MissingImageIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { type GalleryConfig, type GalleryItem } from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { ikTransform } from '../../../utils/imagekit';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';
import { useNotifications } from '../../../hooks/useNotifications';
import { addItem, emptyGallery, moveItemInList, pruneItemTags, removeItem, updateItem } from './galleryDraft';
import { GalleryItemDialog } from './GalleryItemDialog';

/** What the item dialog is editing: an existing item's index, or null to add. */
type DialogState = { itemIndex: number | null };

/**
 * Items tab of /manage/gallery — the gallery's items as one flat list, each
 * taggable with any number of the declared tags from its dialog (tags
 * themselves live on the Tags tab); an added item appears as a thumbnail
 * whose click opens its attributes. Items without an image are flagged: they
 * are not displayed publicly at all. Saves via `PUT /api/config/gallery`,
 * re-reading the draft first so the Tags and Design tabs are never clobbered
 * (item references are pruned against the draft's tags in case one was
 * deleted meanwhile); changes go live only when published from the Config
 * Versions panel.
 */
export const GalleryItemsEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [gallery, setGallery] = useState<GalleryConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (active) setGallery(config.gallery ?? emptyGallery());
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.gallery.error.load' }));
      });
    return () => { active = false; };
  }, [intl]);

  const apply = (mutate: (prev: GalleryConfig) => GalleryConfig): void => {
    setGallery((prev) => (prev ? mutate(prev) : prev));
  };

  const confirmDialog = (item: GalleryItem): void => {
    if (!dialog) return;
    const index = dialog.itemIndex;
    apply((prev) => (index === null ? addItem(prev, item) : updateItem(prev, index, item)));
    setDialog(null);
  };

  const deleteDialogItem = (): void => {
    if (dialog?.itemIndex !== null && dialog?.itemIndex !== undefined) {
      const index = dialog.itemIndex;
      apply((prev) => removeItem(prev, index));
    }
    setDialog(null);
  };

  const handleSave = async (): Promise<void> => {
    if (!gallery) return;
    setSubmitting(true);
    try {
      // Merge over the freshest draft so the Tags and Design tabs survive —
      // pruning references to any tag deleted since this tab loaded.
      const fresh = (await loadDraftConfig()).gallery;
      await updateGallery({
        items: pruneItemTags(gallery.items, fresh?.tags ?? []),
        tags: fresh?.tags ?? [],
        ...(fresh?.design ? { design: fresh.design } : {}),
      });
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
  if (gallery === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader variant="triskelion" size={48} /></Box>;
  }

  const dialogItem = dialog?.itemIndex != null ? (gallery.items[dialog.itemIndex] ?? null) : null;

  /** One thumbnail card: click → attributes dialog; arrows reorder the list. */
  const itemCard = (item: GalleryItem, itemIndex: number): React.ReactNode => {
    const missing = !item.imageUrl?.trim();
    return (
      <Box key={itemIndex} sx={{ minWidth: 0 }}>
        <ButtonBase
          onClick={() => setDialog({ itemIndex })}
          focusRipple
          aria-label={item.title}
          sx={{
            display: 'block',
            width: '100%',
            borderRadius: 1,
            overflow: 'hidden',
            border: 1,
            borderColor: missing ? 'warning.main' : 'divider',
          }}
        >
          {missing ? (
            <Box
              sx={{
                aspectRatio: '1 / 1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                color: 'warning.main',
              }}
            >
              <MissingImageIcon />
            </Box>
          ) : (
            <Box
              component="img"
              src={ikTransform(item.imageUrl ?? '', 'w-280,h-280,q-75,f-auto')}
              alt=""
              loading="lazy"
              sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }}
            />
          )}
        </ButtonBase>
        <Stack direction="row" alignItems="center" sx={{ mt: 0.25 }}>
          <Typography variant="caption" noWrap sx={{ flex: 1 }}>
            {item.title}
          </Typography>
          <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.item.moveEarlier' })}>
            <span>
              <IconButton
                size="small"
                disabled={itemIndex === 0}
                onClick={() => apply((prev) => moveItemInList(prev, itemIndex, -1))}
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.item.moveEarlier' })}
              >
                <EarlierIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.item.moveLater' })}>
            <span>
              <IconButton
                size="small"
                disabled={itemIndex === gallery.items.length - 1}
                onClick={() => apply((prev) => moveItemInList(prev, itemIndex, 1))}
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.item.moveLater' })}
              >
                <LaterIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {(item.tags ?? []).length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
            {(item.tags ?? []).map((tag) => (
              <Chip key={tag} size="small" label={tag} sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem' } }} />
            ))}
          </Box>
        )}
        {missing && (
          <Typography variant="caption" color="warning.main" noWrap component="div">
            <FormattedMessage id="page.manage.gallery.item.noImage" />
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: 860 }}>
      {/* One flat list, browsed from the gallery root; tagging an item (from
          its dialog) adds it to that tag's collection page. */}
      <Typography variant="caption" color="text.secondary" component="div">
        <FormattedMessage id="page.manage.gallery.items.hint" />
      </Typography>
      {gallery.items.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 1.5,
            mt: 1,
          }}
        >
          {gallery.items.map((item, itemIndex) => itemCard(item, itemIndex))}
        </Box>
      )}
      <Button size="small" startIcon={<AddIcon />} onClick={() => setDialog({ itemIndex: null })} sx={{ mt: 1 }}>
        <FormattedMessage id="page.manage.gallery.addItem" />
      </Button>

      <GalleryItemDialog
        open={dialog !== null}
        initial={dialogItem}
        tags={gallery.tags}
        itemIndex={dialog?.itemIndex ?? undefined}
        onCancel={() => setDialog(null)}
        onConfirm={confirmDialog}
        onDelete={dialog?.itemIndex != null ? deleteDialogItem : undefined}
      />

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.gallery.save" />}
        </Button>
      </Box>
    </Box>
  );
};
