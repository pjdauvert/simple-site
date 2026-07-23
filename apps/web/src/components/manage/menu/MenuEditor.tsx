import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowDownward as DownIcon,
  ArrowUpward as UpIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  type MenuEntry,
  type PageConfiguration,
  menuEntryId,
  reconcileMenu,
} from '@simple-site/interfaces';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateMenu } from '../../../services/menuService';
import { useNotifications } from '../../../hooks/useNotifications';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';
import { enabledFeaturePages } from '../../../router/publicMenu';
import { moveItem } from '../pages/pagesDraft';
import { entryRows } from './menuDraft';

/**
 * Menu tab of /manage/site: orders the public navigation and toggles per-entry
 * visibility (a hidden page stays reachable at its URL). Entries reference config
 * pages and feature pages; on load the stored menu is reconciled against the
 * draft's pages and the enabled features (new pages appended visible, newly-enabled
 * features appended hidden, deleted pages pruned). Saves via `PUT /api/config/menu`,
 * which writes the draft — changes go live only when published from the Config
 * Versions panel.
 */
export const MenuEditor: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();
  const flags = useFeatureFlags();

  const [pages, setPages] = useState<PageConfiguration[] | null>(null);
  const [storedEntries, setStoredEntries] = useState<MenuEntry[]>([]);
  const [entries, setEntries] = useState<MenuEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    loadDraftConfig()
      .then((config) => {
        if (!active) return;
        setPages(config.pages);
        setStoredEntries(config.menu?.entries ?? []);
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
    setEntries(reconcileMenu(menu, pages, enabledFeaturePages(flags)).entries);
  }, [entries, pages, storedEntries, flags]);

  const setVisible = (index: number, visible: boolean) => {
    setEntries((prev) => prev?.map((entry, i) => (i === index ? { ...entry, visible } : entry)) ?? prev);
  };

  const move = (from: number, to: number) => {
    setEntries((prev) => (prev ? moveItem(prev, from, to) : prev));
  };

  const handleSave = async () => {
    if (!entries) return;
    setSubmitting(true);
    try {
      await updateMenu({ entries });
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  const rows = entryRows(entries, pages, flags);

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.menu.publishNote" />
      </Typography>

      <List dense disablePadding>
        {rows.map((row, index) => (
          <ListItem
            key={menuEntryId(row.entry)}
            disableGutters
            sx={row.available ? undefined : { opacity: 0.5 }}
            secondaryAction={
              <Stack direction="row" spacing={0} alignItems="center">
                <Tooltip title={intl.formatMessage({ id: 'page.manage.menu.moveUp' })}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
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
                      disabled={index === rows.length - 1}
                      onClick={() => move(index, index + 1)}
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
                      checked={row.entry.visible}
                      disabled={!row.available}
                      onChange={(_, checked) => setVisible(index, checked)}
                      inputProps={{ 'aria-label': intl.formatMessage({ id: 'page.manage.menu.visible' }) }}
                    />
                  </span>
                </Tooltip>
              </Stack>
            }
          >
            <ListItemText
              disableTypography
              primary={
                <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 16 }}>
                  <Typography variant="body2" noWrap>{row.label}</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={<FormattedMessage id={`page.manage.menu.badge.${row.kind}`} />}
                  />
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
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {row.route}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.manage.menu.save" />}
        </Button>
      </Box>
    </Box>
  );
};
