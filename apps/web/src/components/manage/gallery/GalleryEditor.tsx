import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
  EditOutlined as EditIcon,
  HideImageOutlined as MissingImageIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  GALLERY_CAPTION_POSITIONS,
  GALLERY_SCOPE,
  DEFAULT_GALLERY_CAPTION_POSITION,
  galleryItemKey,
  galleryThemeScope,
  galleryThemeTitleKey,
  type GalleryConfig,
  type GalleryItem,
  type GalleryCaptionPosition,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { TranslateShortcut } from '../TranslateShortcut';
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
  moveItemToList,
  moveTheme,
  removeItem,
  removeTheme,
  renameTheme,
  setCaptionPosition,
  updateItem,
} from './galleryDraft';
import { GalleryItemDialog } from './GalleryItemDialog';

/** What the item dialog is editing: a target list (add) or an existing path (edit). */
interface DialogState {
  path: GalleryItemPath | null;
  themeIndex: number | null;
}

/**
 * Gallery editor (/manage/gallery, flag-gated): organises media-library images
 * into themes — each item carries an image, a required title and an optional
 * subtitle, all translation DEFAULTS (per-language values on the Translations
 * page; item keys are positional, so reordering re-maps translations). Themes
 * follow the menu-group model: immutable camelCase id derived from the name at
 * creation, rename changes only the title. Deleting a theme returns its items
 * to the root list. Items without an image are kept but flagged: they are not
 * displayed publicly at all. Saves via `PUT /api/config/gallery`, which writes
 * the DRAFT — changes go live only when published from the Config Versions panel.
 */
export const GalleryEditor: React.FC = () => {
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
  const [rowMenuAnchor, setRowMenuAnchor] = useState<null | HTMLElement>(null);
  const [rowMenuPath, setRowMenuPath] = useState<GalleryItemPath | null>(null);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);
  const [themeMenuIndex, setThemeMenuIndex] = useState<number | null>(null);

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

  const closeRowMenu = (): void => {
    setRowMenuAnchor(null);
    setRowMenuPath(null);
  };

  const closeThemeMenu = (): void => {
    setThemeMenuAnchor(null);
    setThemeMenuIndex(null);
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

  const confirmDialog = (item: GalleryItem): void => {
    if (!dialog) return;
    if (dialog.path) {
      apply((prev) => updateItem(prev, dialog.path as GalleryItemPath, item));
    } else {
      apply((prev) => addItem(prev, dialog.themeIndex, item));
    }
    setDialog(null);
  };

  const handleSave = async (): Promise<void> => {
    if (!gallery) return;
    setSubmitting(true);
    try {
      await updateGallery(gallery);
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

  const captionPosition = gallery.design?.captionPosition ?? DEFAULT_GALLERY_CAPTION_POSITION;
  const dialogItem = dialog?.path ? (itemsAt(gallery, dialog.path.themeIndex)[dialog.path.itemIndex] ?? null) : null;
  const menuItemPath = rowMenuPath;

  /** One item row: thumbnail, title/subtitle, missing-image flag and its actions. */
  const itemRow = (item: GalleryItem, path: GalleryItemPath, scope: string, count: number): React.ReactNode => {
    const missing = !item.imageUrl?.trim();
    return (
      <ListItem
        key={`${scope}-${path.itemIndex}`}
        disableGutters
        sx={{ pl: path.themeIndex === null ? 0 : 4 }}
        secondaryAction={
          <Stack direction="row" spacing={0} alignItems="center">
            <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.item.edit' })}>
              <IconButton
                size="small"
                onClick={() => setDialog({ path, themeIndex: path.themeIndex })}
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.item.edit' })}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <TranslateShortcut
              i18nKey={galleryItemKey(scope, path.itemIndex, 'title')}
              label={intl.formatMessage({ id: 'page.manage.gallery.translate' })}
            />
            <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.moveUp' })}>
              <span>
                <IconButton
                  size="small"
                  disabled={path.itemIndex === 0}
                  onClick={() => apply((prev) => moveItemInList(prev, path, -1))}
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
                  disabled={path.itemIndex === count - 1}
                  onClick={() => apply((prev) => moveItemInList(prev, path, 1))}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.moveDown' })}
                >
                  <DownIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.moreActions' })}>
              <IconButton
                size="small"
                onClick={(e) => { setRowMenuAnchor(e.currentTarget); setRowMenuPath(path); }}
                aria-label={intl.formatMessage({ id: 'page.manage.gallery.moreActions' })}
              >
                <MoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        <ListItemAvatar>
          <Avatar variant="rounded" src={missing ? undefined : item.imageUrl}>
            {missing ? <MissingImageIcon fontSize="small" /> : null}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          disableTypography
          primary={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 22 }}>
              <Typography variant="body2" noWrap>{item.title}</Typography>
              {missing && (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={<FormattedMessage id="page.manage.gallery.item.noImage" />}
                />
              )}
            </Stack>
          }
          secondary={
            item.subtitle ? (
              <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ pr: 22 }}>
                {item.subtitle}
              </Typography>
            ) : null
          }
        />
      </ListItem>
    );
  };

  /** Add-item button of one list (the root or a theme). */
  const addItemButton = (themeIndex: number | null): React.ReactNode => (
    <Button
      size="small"
      startIcon={<AddIcon />}
      onClick={() => setDialog({ path: null, themeIndex })}
      sx={{ ml: themeIndex === null ? 0 : 4 }}
    >
      <FormattedMessage id="page.manage.gallery.addItem" />
    </Button>
  );

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.gallery.publishNote" />
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        {addingTheme ? (
          <Stack direction="row" spacing={1} alignItems="center">
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
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddingTheme(true)}>
            <FormattedMessage id="page.manage.gallery.addTheme" />
          </Button>
        )}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary" id="gallery-caption-position-label">
            <FormattedMessage id="page.manage.gallery.captionPosition" />
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={captionPosition}
            onChange={(_, value: GalleryCaptionPosition | null) => {
              if (value) apply((prev) => setCaptionPosition(prev, value));
            }}
            aria-labelledby="gallery-caption-position-label"
          >
            {GALLERY_CAPTION_POSITIONS.map((position) => (
              <ToggleButton key={position} value={position}>
                <FormattedMessage id={`page.manage.gallery.captionPosition.${position}`} />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Unthemed items — explored from the gallery root page. */}
      <Typography variant="subtitle2" gutterBottom>
        <FormattedMessage id="page.manage.gallery.rootItems" />
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
        <FormattedMessage id="page.manage.gallery.rootItems.hint" />
      </Typography>
      <List dense disablePadding>
        {gallery.items.map((item, itemIndex) =>
          itemRow(item, { themeIndex: null, itemIndex }, GALLERY_SCOPE, gallery.items.length),
        )}
      </List>
      {addItemButton(null)}

      {/* Themes — each explored at /gallery/<themeId>, submenu of the nav entry. */}
      {gallery.themes.map((theme, themeIndex) => {
        const scope = galleryThemeScope(theme.themeId);
        return (
          <Box key={theme.themeId} sx={{ mt: 3 }}>
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
              <Tooltip title={intl.formatMessage({ id: 'page.manage.gallery.moreActions' })}>
                <IconButton
                  size="small"
                  onClick={(e) => { setThemeMenuAnchor(e.currentTarget); setThemeMenuIndex(themeIndex); }}
                  aria-label={intl.formatMessage({ id: 'page.manage.gallery.moreActions' })}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            {theme.items.length === 0 && (
              <Typography variant="caption" color="warning.main" component="div" sx={{ pl: 4, mt: 0.5 }}>
                <FormattedMessage id="page.manage.gallery.theme.empty" />
              </Typography>
            )}
            <List dense disablePadding>
              {theme.items.map((item, itemIndex) => itemRow(item, { themeIndex, itemIndex }, scope, theme.items.length))}
            </List>
            {addItemButton(themeIndex)}
          </Box>
        );
      })}

      {/* Item overflow menu: move between lists, delete. */}
      <Menu anchorEl={rowMenuAnchor} open={Boolean(rowMenuAnchor)} onClose={closeRowMenu}>
        {menuItemPath && menuItemPath.themeIndex !== null && (
          <MenuItem
            onClick={() => {
              apply((prev) => moveItemToList(prev, menuItemPath, null));
              closeRowMenu();
            }}
          >
            <FormattedMessage id="page.manage.gallery.item.moveOut" />
          </MenuItem>
        )}
        {menuItemPath &&
          gallery.themes.map((theme, themeIndex) =>
            themeIndex === menuItemPath.themeIndex ? null : (
              <MenuItem
                key={theme.themeId}
                onClick={() => {
                  apply((prev) => moveItemToList(prev, menuItemPath, themeIndex));
                  closeRowMenu();
                }}
              >
                <FormattedMessage id="page.manage.gallery.item.moveToTheme" values={{ theme: theme.title }} />
              </MenuItem>
            ),
          )}
        {menuItemPath && (
          <MenuItem
            onClick={() => {
              apply((prev) => removeItem(prev, menuItemPath));
              closeRowMenu();
            }}
          >
            <FormattedMessage id="page.manage.gallery.item.delete" />
          </MenuItem>
        )}
      </Menu>

      {/* Theme overflow menu: delete (items return to the root list). */}
      <Menu anchorEl={themeMenuAnchor} open={Boolean(themeMenuAnchor)} onClose={closeThemeMenu}>
        <MenuItem
          onClick={() => {
            if (themeMenuIndex !== null) apply((prev) => removeTheme(prev, themeMenuIndex));
            closeThemeMenu();
          }}
        >
          <FormattedMessage id="page.manage.gallery.deleteTheme" />
        </MenuItem>
      </Menu>

      <GalleryItemDialog
        open={dialog !== null}
        initial={dialogItem}
        onCancel={() => setDialog(null)}
        onConfirm={confirmDialog}
      />

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.manage.gallery.save" />}
        </Button>
      </Box>
    </Box>
  );
};
