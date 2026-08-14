import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Switch,
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
  EditOutlined as RenameIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  type GalleryTag,
  type MenuEntry,
  type MenuGroupDisplay,
  type PageConfiguration,
} from '@simple-site/interfaces';
import { Loader } from '../../Loader';
import { StickySaveButton } from '../StickySaveButton';
import { TranslateShortcut } from '../TranslateShortcut';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateMenu } from '../../../services/menuService';
import { useNotifications } from '../../../hooks/useNotifications';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { enabledFeaturePages, reconcileMenu } from '../../../router/publicMenu';
import {
  type MenuEntryRow,
  addGroup,
  deleteGroup,
  entryRows,
  moveEntry,
  moveIntoGroup,
  moveOutOfGroup,
  normalizedMenuTitle,
  setEntryTitle,
  setEntryVisible,
  setGroupAlwaysExpanded,
} from './menuDraft';

/**
 * Menu tab of /manage/site: orders the public navigation, toggles per-entry
 * visibility (a hidden page stays reachable at its URL) and renames nav labels
 * in place — a page entry's custom label overrides the page's own title, a
 * feature entry's label defaults to the feature's default; an emptied field
 * reverts to the fallback. Labels are translation defaults: per-language values
 * live on the Translations page (`<pageName|feature>.menuTitle`, and
 * `menu.<groupId>.menuTitle` for groups). Entries reference config pages and
 * feature pages; on load the stored menu is reconciled against the draft's
 * pages and the enabled features (new pages appended visible, newly-enabled
 * features appended hidden, deleted pages pruned — inside groups too).
 *
 * Groups are one-level submenus: a group row is followed by its indented
 * children; move up/down stays within a level (a group moves as a block), and
 * the per-row overflow menu moves entries into or out of groups, toggles a
 * group's mobile "always expanded" mode, and deletes a group (its children
 * return to the top level, in place). An empty group is kept in the draft but
 * omitted from the public nav. Saves via `PUT /api/config/menu`, which writes
 * the draft — changes go live only when published from the Config Versions
 * panel.
 */
export const MenuEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();
  const flags = useFeatureFlags();

  const [pages, setPages] = useState<PageConfiguration[] | null>(null);
  const [galleryTags, setGalleryTags] = useState<GalleryTag[]>([]);
  const [storedEntries, setStoredEntries] = useState<MenuEntry[]>([]);
  const [entries, setEntries] = useState<MenuEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [groupDisplay, setGroupDisplay] = useState<MenuGroupDisplay>('popover');
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupLabel, setGroupLabel] = useState('');
  const [rowMenuAnchor, setRowMenuAnchor] = useState<null | HTMLElement>(null);
  const [rowMenuIndex, setRowMenuIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setPages(config.pages);
        setGalleryTags(config.gallery?.tags ?? []);
        setStoredEntries(config.menu?.entries ?? []);
        setGroupDisplay(config.menu?.groupDisplay ?? 'popover');
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.menu.error.load' }));
      });
    return () => { active = false; };
  }, [intl]);

  // Reconcile once both the draft and the feature flags are known. A config with
  // no menu yet seeds from the pages order, so the tab always shows every page.
  useEffect(() => {
    if (entries !== null || pages === null || flags === null) return;
    const menu = storedEntries.length > 0 ? { entries: storedEntries } : undefined;
    setEntries(
      reconcileMenu(menu, pages, enabledFeaturePages(flags), galleryTags.map((tag) => tag.tag)).entries,
    );
  }, [entries, pages, storedEntries, flags, galleryTags]);

  const apply = (mutate: (prev: MenuEntry[]) => MenuEntry[]) => {
    setEntries((prev) => (prev ? mutate(prev) : prev));
  };

  const startRename = (index: number, currentTitle: string | undefined) => {
    setRenamingIndex(index);
    setRenameValue(currentTitle ?? '');
  };

  /**
   * Commits the rename: an empty field (or the fallback label itself) reverts to
   * it — except for groups, whose label is required: there an empty field keeps
   * the current label.
   */
  const commitRename = (row: MenuEntryRow) => {
    apply((prev) => setEntryTitle(prev, row.path, normalizedMenuTitle(renameValue, row.baseLabel)));
    setRenamingIndex(null);
  };

  const closeRowMenu = () => {
    setRowMenuAnchor(null);
    setRowMenuIndex(null);
  };

  const confirmAddGroup = () => {
    const label = groupLabel.trim();
    if (!label) return;
    apply((prev) => addGroup(prev, label));
    setAddingGroup(false);
    setGroupLabel('');
  };

  const handleSave = async () => {
    if (!entries) return;
    setSubmitting(true);
    try {
      // "popover" is the default — omitted to keep stored configs minimal.
      await updateMenu({ entries, ...(groupDisplay === 'bar' ? { groupDisplay } : {}) });
      notify.success(intl.formatMessage({ id: 'page.manage.menu.saved' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.menu.error.save' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }
  if (entries === null || pages === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><Loader variant="triskelion" size={48} /></Box>;
  }

  const rows = entryRows(entries, pages, flags, galleryTags);
  const groups = entries.flatMap((entry) => (entry.type === 'group' ? [entry] : []));
  const menuRow = rowMenuIndex !== null ? rows[rowMenuIndex] : null;
  /** The gallery entry carries its own tag submenu — it can never join a group. */
  const isGalleryRow = (row: MenuEntryRow): boolean =>
    row.entry.type === 'feature' && row.entry.feature === 'gallery' && row.kind === 'feature';

  /** Bounds of the row's own level: children move within their group/submenu. */
  const levelBounds = (row: MenuEntryRow): { first: boolean; last: boolean } => {
    if (row.path.tag !== undefined) {
      const parent = entries[row.path.top];
      const count = parent?.type === 'feature' ? (parent.galleryTags?.length ?? 0) : 0;
      return { first: row.path.tag === 0, last: row.path.tag === count - 1 };
    }
    if (row.path.child !== undefined) {
      const parent = entries[row.path.top];
      const count = parent?.type === 'group' ? parent.children.length : 0;
      return { first: row.path.child === 0, last: row.path.child === count - 1 };
    }
    return { first: row.path.top === 0, last: row.path.top === entries.length - 1 };
  };

  /** The overflow menu only shows when it has something to offer. */
  const hasRowMenu = (row: MenuEntryRow): boolean =>
    row.kind !== 'galleryTag' &&
    (row.kind === 'group' || row.depth === 1 || (groups.length > 0 && !isGalleryRow(row)));

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.menu.publishNote" />
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        {addingGroup ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              autoFocus
              value={groupLabel}
              label={intl.formatMessage({ id: 'page.manage.menu.addGroup.label' })}
              onChange={(e) => setGroupLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddGroup();
                if (e.key === 'Escape') { setAddingGroup(false); setGroupLabel(''); }
              }}
            />
            <Button size="small" variant="contained" disabled={!groupLabel.trim()} onClick={confirmAddGroup}>
              <FormattedMessage id="page.manage.menu.addGroup.confirm" />
            </Button>
            <Button size="small" onClick={() => { setAddingGroup(false); setGroupLabel(''); }}>
              <FormattedMessage id="page.manage.menu.addGroup.cancel" />
            </Button>
          </Stack>
        ) : (
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddingGroup(true)}>
            <FormattedMessage id="page.manage.menu.addGroup" />
          </Button>
        )}
        {groups.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary" id="menu-group-display-label">
              <FormattedMessage id="page.manage.menu.groupDisplay" />
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={groupDisplay}
              onChange={(_, value: MenuGroupDisplay | null) => { if (value) setGroupDisplay(value); }}
              aria-labelledby="menu-group-display-label"
            >
              <ToggleButton value="popover">
                <FormattedMessage id="page.manage.menu.groupDisplay.popover" />
              </ToggleButton>
              <ToggleButton value="bar">
                <FormattedMessage id="page.manage.menu.groupDisplay.bar" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        )}
      </Stack>

      <List dense disablePadding>
        {rows.map((row, index) => {
          const bounds = levelBounds(row);
          return (
            <ListItem
              key={row.rowKey}
              disableGutters
              sx={{
                ...(row.available ? null : { opacity: 0.5 }),
                ...(row.depth === 1 ? { pl: 4 } : null),
              }}
              secondaryAction={
                <Stack direction="row" spacing={0} alignItems="center">
                  {row.kind !== 'galleryTag' && (
                    <Tooltip title={intl.formatMessage({ id: 'page.manage.menu.rename' })}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={renamingIndex === index}
                          onClick={() => startRename(index, row.entry.menuTitle)}
                          aria-label={intl.formatMessage({ id: 'page.manage.menu.rename' })}
                        >
                          <RenameIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <TranslateShortcut
                    i18nKey={row.i18nKey}
                    label={intl.formatMessage({ id: 'page.manage.menu.translate' })}
                  />
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.menu.moveUp' })}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={bounds.first}
                        onClick={() => { apply((prev) => moveEntry(prev, row.path, -1)); setRenamingIndex(null); }}
                        aria-label={intl.formatMessage({ id: 'page.manage.menu.moveUp' })}
                      >
                        <UpIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.menu.moveDown' })}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={bounds.last}
                        onClick={() => { apply((prev) => moveEntry(prev, row.path, 1)); setRenamingIndex(null); }}
                        aria-label={intl.formatMessage({ id: 'page.manage.menu.moveDown' })}
                      >
                        <DownIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: 'page.manage.menu.visible' })}>
                    <span>
                      <Switch
                        size="small"
                        checked={row.visible}
                        disabled={!row.available}
                        onChange={(_, checked) => apply((prev) => setEntryVisible(prev, row.path, checked))}
                        inputProps={{ 'aria-label': intl.formatMessage({ id: 'page.manage.menu.visible' }) }}
                      />
                    </span>
                  </Tooltip>
                  {hasRowMenu(row) && (
                    <Tooltip title={intl.formatMessage({ id: 'page.manage.menu.moreActions' })}>
                      <IconButton
                        size="small"
                        onClick={(e) => { setRowMenuAnchor(e.currentTarget); setRowMenuIndex(index); }}
                        aria-label={intl.formatMessage({ id: 'page.manage.menu.moreActions' })}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              }
            >
              <ListItemText
                disableTypography
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 26 }}>
                    {renamingIndex === index ? (
                      <TextField
                        size="small"
                        variant="standard"
                        autoFocus
                        value={renameValue}
                        placeholder={row.baseLabel}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(row);
                          if (e.key === 'Escape') setRenamingIndex(null);
                        }}
                        slotProps={{ htmlInput: { 'aria-label': intl.formatMessage({ id: 'page.manage.menu.rename' }) } }}
                      />
                    ) : (
                      <Typography variant="body2" noWrap sx={row.kind === 'group' ? { fontWeight: 600 } : undefined}>
                        {row.label}
                      </Typography>
                    )}
                    {!row.available && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={<FormattedMessage id="page.manage.menu.unavailable" />}
                      />
                    )}
                  </Stack>
                }
                secondary={
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, pr: 26 }}>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {row.kind === 'group' ? (
                        <FormattedMessage id="page.manage.menu.group.childCount" values={{ count: row.childCount ?? 0 }} />
                      ) : (
                        row.route
                      )}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={<FormattedMessage id={`page.manage.menu.badge.${row.kind}`} />}
                      sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem' } }}
                    />
                    {row.kind === 'group' && row.childCount === 0 && (
                      <Typography variant="caption" color="warning.main" noWrap component="div">
                        <FormattedMessage id="page.manage.menu.group.empty" />
                      </Typography>
                    )}
                  </Stack>
                }
              />
            </ListItem>
          );
        })}
      </List>

      <Menu anchorEl={rowMenuAnchor} open={Boolean(rowMenuAnchor)} onClose={closeRowMenu}>
        {menuRow?.kind === 'group' && [
          <MenuItem
            key="alwaysExpanded"
            onClick={() => {
              apply((prev) => setGroupAlwaysExpanded(prev, menuRow.path.top, !menuRow.alwaysExpanded));
              closeRowMenu();
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch size="small" checked={Boolean(menuRow.alwaysExpanded)} tabIndex={-1} sx={{ pointerEvents: 'none' }} />
              <FormattedMessage id="page.manage.menu.alwaysExpanded" />
            </Stack>
          </MenuItem>,
          <MenuItem
            key="deleteGroup"
            onClick={() => {
              apply((prev) => deleteGroup(prev, menuRow.path.top));
              closeRowMenu();
            }}
          >
            <FormattedMessage id="page.manage.menu.deleteGroup" />
          </MenuItem>,
        ]}
        {menuRow && menuRow.kind !== 'group' && menuRow.depth === 1 && (
          <MenuItem
            onClick={() => {
              apply((prev) => moveOutOfGroup(prev, menuRow.path));
              closeRowMenu();
            }}
          >
            <FormattedMessage id="page.manage.menu.moveOut" />
          </MenuItem>
        )}
        {menuRow && menuRow.kind !== 'group' && menuRow.depth === 0 &&
          groups.map((group) => (
            <MenuItem
              key={group.groupId}
              onClick={() => {
                apply((prev) => moveIntoGroup(prev, menuRow.path.top, group.groupId));
                closeRowMenu();
              }}
            >
              <FormattedMessage id="page.manage.menu.moveToGroup" values={{ group: group.menuTitle }} />
            </MenuItem>
          ))}
      </Menu>

      <StickySaveButton onClick={handleSave} disabled={submitting} submitting={submitting}>
        <FormattedMessage id="page.manage.menu.save" />
      </StickySaveButton>
    </Box>
  );
};
