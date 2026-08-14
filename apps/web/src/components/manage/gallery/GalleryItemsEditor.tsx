import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronLeft as EarlierIcon,
  ChevronRight as LaterIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  HideImageOutlined as MissingImageIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  galleryTagDescriptionKey,
  galleryTagNameKey,
  type GalleryConfig,
  type GalleryItem,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { TranslateShortcut } from '../TranslateShortcut';
import { ikTransform } from '../../../utils/imagekit';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';
import { useNotifications } from '../../../hooks/useNotifications';
import {
  addItem,
  addTag,
  emptyGallery,
  isValidNewTag,
  moveItemInList,
  removeItem,
  removeTag,
  setTagDescription,
  setTagDisplayName,
  updateItem,
} from './galleryDraft';
import { GalleryItemDialog } from './GalleryItemDialog';

/** What the item dialog is editing: an existing item's index, or null to add. */
type DialogState = { itemIndex: number | null };

/**
 * Items & tags tab of /manage/gallery. Tags have their lifecycle here: created
 * with an immutable id (plain alphanumerics plus `-`/`_` — it doubles as the
 * collection's URL segment and i18n-key segment), presented through a
 * translatable displayName and description, deleted WITH their references
 * (every item carrying the tag is untagged; the items stay). Collections are
 * never added to the navigation automatically — the admin links them from the
 * menu explicitly (Site settings → Menu). Below the tags, the gallery's items:
 * one flat list, each item taggable with any number of tags from its dialog;
 * an added item appears as a thumbnail whose click opens its attributes.
 * Items without an image are flagged: they are not displayed publicly at all.
 * Saves via `PUT /api/config/gallery`, re-reading the draft first so the
 * Design tab's settings are never clobbered; changes go live only when
 * published from the Config Versions panel.
 */
export const GalleryItemsEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [gallery, setGallery] = useState<GalleryConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagId, setTagId] = useState('');
  const [tagName, setTagName] = useState('');
  const [renamingTag, setRenamingTag] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
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

  const cancelAddTag = (): void => {
    setAddingTag(false);
    setTagId('');
    setTagName('');
  };

  const confirmAddTag = (): void => {
    if (!gallery || !isValidNewTag(gallery, tagId.trim())) return;
    apply((prev) => addTag(prev, tagId, tagName));
    cancelAddTag();
  };

  const commitTagRename = (tagIndex: number): void => {
    apply((prev) => setTagDisplayName(prev, tagIndex, renameValue));
    setRenamingTag(null);
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
      // Merge over the freshest draft so the Design tab's settings survive.
      const fresh = (await loadDraftConfig()).gallery;
      await updateGallery({
        items: gallery.items,
        tags: gallery.tags,
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

  const trimmedTagId = tagId.trim();
  const tagIdInvalid = trimmedTagId.length > 0 && !isValidNewTag(gallery, trimmedTagId);
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
      {/* Tags — their whole lifecycle lives here. The id is immutable once
          created; deleting a tag also deletes its references on the items. */}
      <Typography variant="subtitle2" gutterBottom>
        <FormattedMessage id="page.manage.gallery.tags" />
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
        <FormattedMessage id="page.manage.gallery.tags.hint" />
      </Typography>

      {gallery.tags.map((tag, tagIndex) => {
        const itemCount = gallery.items.filter((item) => (item.tags ?? []).includes(tag.tag)).length;
        return (
          <Box key={tag.tag} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={tag.tag} sx={{ fontFamily: 'monospace' }} />
              {renamingTag === tagIndex ? (
                <TextField
                  size="small"
                  variant="standard"
                  autoFocus
                  value={renameValue}
                  placeholder={tag.displayName}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitTagRename(tagIndex)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTagRename(tagIndex);
                    if (e.key === 'Escape') setRenamingTag(null);
                  }}
                  slotProps={{ htmlInput: { 'aria-label': intl.formatMessage({ id: 'page.manage.gallery.tag.rename' }) } }}
                />
              ) : (
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                  {tag.displayName}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" noWrap>
                /gallery/tag/{tag.tag}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color={itemCount === 0 ? 'warning.main' : 'text.secondary'} noWrap>
                <FormattedMessage id="page.manage.gallery.tag.itemCount" values={{ count: itemCount }} />
              </Typography>
              <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.tag.rename' })}>
                <span>
                  <IconButton
                    size="small"
                    disabled={renamingTag === tagIndex}
                    onClick={() => { setRenamingTag(tagIndex); setRenameValue(tag.displayName); }}
                    aria-label={intl.formatMessage({ id: 'page.manage.gallery.tag.rename' })}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <TranslateShortcut
                i18nKey={galleryTagNameKey(tag.tag)}
                label={intl.formatMessage({ id: 'page.manage.gallery.translate' })}
              />
              <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.tag.delete' })}>
                <IconButton
                  size="small"
                  onClick={() => apply((prev) => removeTag(prev, tagIndex))}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.tag.delete' })}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            {/* Introduction shown under the collection page's heading — a
                translation DEFAULT, hence the Translate shortcut next to it. */}
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={tag.description ?? ''}
              onChange={(e) => apply((prev) => setTagDescription(prev, tagIndex, e.target.value))}
              label={intl.formatMessage({ id: 'page.manage.gallery.tag.description' })}
              helperText={<FormattedMessage id="page.manage.gallery.tag.description.hint" />}
              sx={{ mt: 1 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <TranslateShortcut
                        i18nKey={galleryTagDescriptionKey(tag.tag)}
                        label={intl.formatMessage({ id: 'page.manage.gallery.translate' })}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        );
      })}

      {addingTag ? (
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            size="small"
            autoFocus
            value={tagId}
            error={tagIdInvalid}
            label={intl.formatMessage({ id: 'page.manage.gallery.addTag.id' })}
            helperText={
              <FormattedMessage
                id={tagIdInvalid ? 'page.manage.gallery.addTag.invalid' : 'page.manage.gallery.addTag.idHint'}
              />
            }
            onChange={(e) => setTagId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAddTag();
              if (e.key === 'Escape') cancelAddTag();
            }}
          />
          <TextField
            size="small"
            value={tagName}
            label={intl.formatMessage({ id: 'page.manage.gallery.addTag.displayName' })}
            placeholder={trimmedTagId}
            onChange={(e) => setTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAddTag();
              if (e.key === 'Escape') cancelAddTag();
            }}
          />
          <Button
            size="small"
            variant="contained"
            disabled={!trimmedTagId || tagIdInvalid}
            onClick={confirmAddTag}
            sx={{ mt: 0.5 }}
          >
            <FormattedMessage id="page.manage.gallery.addTag.confirm" />
          </Button>
          <Button size="small" onClick={cancelAddTag} sx={{ mt: 0.5 }}>
            <FormattedMessage id="page.manage.gallery.addTag.cancel" />
          </Button>
        </Stack>
      ) : (
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddingTag(true)}>
          <FormattedMessage id="page.manage.gallery.addTag" />
        </Button>
      )}

      {/* The items — one flat list, browsed from the gallery root; tagging an
          item adds it to that tag's collection page. */}
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 4 }}>
        <FormattedMessage id="page.manage.gallery.items" />
      </Typography>
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
