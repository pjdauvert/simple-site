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
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  ChevronLeft as EarlierIcon,
  ChevronRight as LaterIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  HideImageOutlined as MissingImageIcon,
  StarRounded as CoverIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  GALLERY_SCOPE,
  galleryThemePresentationKey,
  galleryThemeScope,
  galleryThemeTitleKey,
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
  type GalleryItemPath,
  addItem,
  addTheme,
  emptyGallery,
  itemsAt,
  moveItemInList,
  moveTheme,
  removeItem,
  removeTheme,
  renameTheme,
  setThemeCover,
  setThemePresentation,
  clearThemeCover,
  updateItem,
} from './galleryDraft';
import { GalleryItemDialog } from './GalleryItemDialog';

/** What the item dialog is editing: an existing path (edit) or a target list (add). */
interface DialogState {
  path: GalleryItemPath | null;
  themeIndex: number | null;
}

/**
 * Themes & images tab of /manage/gallery: add / rename / reorder / delete
 * themes (immutable camelCase ids — renames keep translations; deleting
 * returns the items to the unthemed list), and manage each list's images. An
 * added item appears as a thumbnail; clicking a thumbnail opens its attributes
 * dialog (image, title, subtitle, theme — moving lists appends at the end —
 * and delete). Items without an image are flagged: they are not displayed
 * publicly at all. Saves via `PUT /api/config/gallery`, re-reading the draft
 * first so the Design tab's settings are never clobbered; changes go live only
 * when published from the Config Versions panel.
 */
export const GalleryThemesEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [gallery, setGallery] = useState<GalleryConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addingTheme, setAddingTheme] = useState(false);
  const [themeLabel, setThemeLabel] = useState('');
  const [renamingTheme, setRenamingTheme] = useState<number | null>(null);
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

  const confirmAddTheme = (): void => {
    const label = themeLabel.trim();
    if (!label) return;
    apply((prev) => addTheme(prev, label));
    setAddingTheme(false);
    setThemeLabel('');
  };

  const commitThemeRename = (themeIndex: number): void => {
    apply((prev) => renameTheme(prev, themeIndex, renameValue));
    setRenamingTheme(null);
  };

  const confirmDialog = (item: GalleryItem, target: number | null): void => {
    if (!dialog) return;
    const path = dialog.path;
    if (!path) {
      apply((prev) => addItem(prev, target, item));
    } else if (target === path.themeIndex) {
      apply((prev) => updateItem(prev, path, item));
    } else {
      // Moved to another list: leaves its position, appends at the target's end.
      apply((prev) => addItem(removeItem(prev, path), target, item));
    }
    setDialog(null);
  };

  const deleteDialogItem = (): void => {
    if (dialog?.path) {
      const path = dialog.path;
      apply((prev) => removeItem(prev, path));
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
        themes: gallery.themes,
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

  const dialogItem = dialog?.path ? (itemsAt(gallery, dialog.path.themeIndex)[dialog.path.itemIndex] ?? null) : null;
  const dialogScope =
    dialog?.path?.themeIndex != null
      ? galleryThemeScope(gallery.themes[dialog.path.themeIndex]?.themeId ?? '')
      : GALLERY_SCOPE;

  /** One thumbnail card: click → attributes dialog; arrows reorder within the list. */
  const itemCard = (
    item: GalleryItem,
    path: GalleryItemPath,
    count: number,
    isCover = false,
  ): React.ReactNode => {
    const missing = !item.imageUrl?.trim();
    return (
      <Box key={`${path.themeIndex ?? 'root'}-${path.itemIndex}`} sx={{ minWidth: 0, position: 'relative' }}>
        {isCover && (
          <Chip
            size="small"
            color="primary"
            icon={<CoverIcon />}
            label={<FormattedMessage id="page.manage.gallery.item.cover" />}
            sx={{ position: 'absolute', top: 4, left: 4, zIndex: 1, height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
          />
        )}
        <ButtonBase
          onClick={() => setDialog({ path, themeIndex: path.themeIndex })}
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
                disabled={path.itemIndex === 0}
                onClick={() => apply((prev) => moveItemInList(prev, path, -1))}
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
                disabled={path.itemIndex === count - 1}
                onClick={() => apply((prev) => moveItemInList(prev, path, 1))}
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.item.moveLater' })}
              >
                <LaterIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {missing && (
          <Typography variant="caption" color="warning.main" noWrap component="div">
            <FormattedMessage id="page.manage.gallery.item.noImage" />
          </Typography>
        )}
      </Box>
    );
  };

  /** A list's thumbnail grid plus its Add button. */
  const itemsGrid = (items: GalleryItem[], themeIndex: number | null): React.ReactNode => {
    // The theme's cover badge marks the explicit pick only — the implicit
    // fallback (first displayable) stays unlabelled, as it isn't a choice.
    const coverIndex = themeIndex === null ? undefined : gallery.themes[themeIndex]?.coverIndex;
    return (
    <>
      {items.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 1.5,
            mt: 1,
          }}
        >
          {items.map((item, itemIndex) =>
            itemCard(item, { themeIndex, itemIndex }, items.length, itemIndex === coverIndex),
          )}
        </Box>
      )}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setDialog({ path: null, themeIndex })}
        sx={{ mt: 1 }}
      >
        <FormattedMessage id="page.manage.gallery.addItem" />
      </Button>
    </>
    );
  };

  return (
    <Box sx={{ maxWidth: 860 }}>
      {addingTheme ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <TextField
            size="small"
            autoFocus
            value={themeLabel}
            label={intl.formatMessage({ id: 'page.manage.gallery.addTheme.label' })}
            onChange={(e) => setThemeLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAddTheme();
              if (e.key === 'Escape') { setAddingTheme(false); setThemeLabel(''); }
            }}
          />
          <Button size="small" variant="contained" disabled={!themeLabel.trim()} onClick={confirmAddTheme}>
            <FormattedMessage id="page.manage.gallery.addTheme.confirm" />
          </Button>
          <Button size="small" onClick={() => { setAddingTheme(false); setThemeLabel(''); }}>
            <FormattedMessage id="page.manage.gallery.addTheme.cancel" />
          </Button>
        </Stack>
      ) : (
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAddingTheme(true)}
          sx={{ mb: 3 }}
        >
          <FormattedMessage id="page.manage.gallery.addTheme" />
        </Button>
      )}

      {/* Unthemed items — explored from the gallery root page. */}
      <Typography variant="subtitle2" gutterBottom>
        <FormattedMessage id="page.manage.gallery.rootItems" />
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div">
        <FormattedMessage id="page.manage.gallery.rootItems.hint" />
      </Typography>
      {itemsGrid(gallery.items, null)}

      {/* Themes — each explored at /gallery/<themeId>, submenu of the nav entry. */}
      {gallery.themes.map((theme, themeIndex) => (
        <Box key={theme.themeId} sx={{ mt: 4 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {renamingTheme === themeIndex ? (
              <TextField
                size="small"
                variant="standard"
                autoFocus
                value={renameValue}
                placeholder={theme.title}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitThemeRename(themeIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitThemeRename(themeIndex);
                  if (e.key === 'Escape') setRenamingTheme(null);
                }}
                slotProps={{ htmlInput: { 'aria-label': intl.formatMessage({ id: 'page.manage.gallery.renameTheme' }) } }}
              />
            ) : (
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                {theme.title}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" noWrap>
              /gallery/{theme.themeId}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.renameTheme' })}>
              <span>
                <IconButton
                  size="small"
                  disabled={renamingTheme === themeIndex}
                  onClick={() => { setRenamingTheme(themeIndex); setRenameValue(theme.title); }}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.renameTheme' })}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <TranslateShortcut
              i18nKey={galleryThemeTitleKey(theme.themeId)}
              label={intl.formatMessage({ id: 'page.manage.gallery.translate' })}
            />
            <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.moveUp' })}>
              <span>
                <IconButton
                  size="small"
                  disabled={themeIndex === 0}
                  onClick={() => apply((prev) => moveTheme(prev, themeIndex, -1))}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.moveUp' })}
                >
                  <UpIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.moveDown' })}>
              <span>
                <IconButton
                  size="small"
                  disabled={themeIndex === gallery.themes.length - 1}
                  onClick={() => apply((prev) => moveTheme(prev, themeIndex, 1))}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.moveDown' })}
                >
                  <DownIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.deleteTheme' })}>
              <IconButton
                size="small"
                onClick={() => apply((prev) => removeTheme(prev, themeIndex))}
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.deleteTheme' })}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          {theme.items.length === 0 && (
            <Typography variant="caption" color="warning.main" component="div" sx={{ mt: 0.5 }}>
              <FormattedMessage id="page.manage.gallery.theme.empty" />
            </Typography>
          )}
          {/* Introduction shown under the theme page's heading — a translation
              DEFAULT, hence the Translate shortcut next to it. */}
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={theme.presentation ?? ''}
            onChange={(e) => apply((prev) => setThemePresentation(prev, themeIndex, e.target.value))}
            label={intl.formatMessage({ id: 'page.manage.gallery.theme.presentation' })}
            helperText={<FormattedMessage id="page.manage.gallery.theme.presentation.hint" />}
            sx={{ mt: 1.5 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <TranslateShortcut
                      i18nKey={galleryThemePresentationKey(theme.themeId)}
                      label={intl.formatMessage({ id: 'page.manage.gallery.translate' })}
                    />
                  </InputAdornment>
                ),
              },
            }}
          />
          {itemsGrid(theme.items, themeIndex)}
        </Box>
      ))}

      <GalleryItemDialog
        open={dialog !== null}
        initial={dialogItem}
        themes={gallery.themes}
        location={dialog?.path ? dialog.path.themeIndex : (dialog?.themeIndex ?? null)}
        i18n={dialog?.path ? { scope: dialogScope, index: dialog.path.itemIndex } : undefined}
        cover={
          dialog?.path && dialog.path.themeIndex !== null
            ? {
                isCover: gallery.themes[dialog.path.themeIndex]?.coverIndex === dialog.path.itemIndex,
                onToggle: (isCover) => {
                  const path = dialog.path as GalleryItemPath;
                  apply((prev) =>
                    isCover ? setThemeCover(prev, path) : clearThemeCover(prev, path.themeIndex as number),
                  );
                },
              }
            : undefined
        }
        onCancel={() => setDialog(null)}
        onConfirm={confirmDialog}
        onDelete={dialog?.path ? deleteDialogItem : undefined}
      />

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.gallery.save" />}
        </Button>
      </Box>
    </Box>
  );
};
