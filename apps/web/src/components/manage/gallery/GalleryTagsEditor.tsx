import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { galleryTagDescriptionKey, galleryTagNameKey, type GalleryConfig } from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { StickySaveButton } from '../StickySaveButton';
import { TranslateShortcut } from '../TranslateShortcut';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';
import { useNotifications } from '../../../hooks/useNotifications';
import {
  addTag,
  emptyGallery,
  isValidNewTag,
  pruneItemTags,
  removeTag,
  setTagDescription,
  setTagDisplayName,
} from './galleryDraft';

/**
 * Tags tab of /manage/gallery — the tag lifecycle lives here: created with an
 * immutable id (plain alphanumerics plus `-`/`_` — it doubles as the
 * collection's URL segment and i18n-key segment), presented through a
 * translatable displayName and description, deleted WITH their references
 * (every item carrying the tag is untagged; the items stay — the cascade is
 * applied at save time against the freshest draft items). Items are tagged on
 * the Items tab; collections reach the navigation only through the Menu tab.
 * Saves via `PUT /api/config/gallery`, re-reading the draft first so the
 * Items and Design tabs are never clobbered; changes go live only when
 * published from the Config Versions panel.
 */
export const GalleryTagsEditor: React.FC = () => {
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

  const handleSave = async (): Promise<void> => {
    if (!gallery) return;
    setSubmitting(true);
    try {
      // Merge over the freshest draft so the Items and Design tabs survive —
      // the delete cascade prunes the fresh items against the saved tag set.
      const fresh = (await loadDraftConfig()).gallery;
      await updateGallery({
        items: pruneItemTags(fresh?.items ?? [], gallery.tags),
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

  return (
    <Box sx={{ maxWidth: 860 }}>
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

      <StickySaveButton onClick={handleSave} disabled={submitting} submitting={submitting}>
        <FormattedMessage id="page.manage.gallery.save" />
      </StickySaveButton>
    </Box>
  );
};
