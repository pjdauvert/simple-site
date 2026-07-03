import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloudUpload as ImportIcon,
  DeleteOutline as DeleteIcon,
  Download as DownloadIcon,
  Edit as RenameIcon,
  Publish as PublishIcon,
  Restore as RepublishIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { ConfigVersionSummary, ConfigVersionsManifest, SiteConfig } from '@simple-site/interfaces';
import { SiteConfigSchema } from '@simple-site/interfaces';
import {
  deleteVersion,
  getVersionConfig,
  importConfig,
  listVersions,
  publishDraft,
  renameVersion,
  republishVersion,
} from '../../services/configVersionService';

type Kind = 'published' | 'draft' | 'archive';
type Row = { version: ConfigVersionSummary; kind: Kind };
type Feedback = { severity: 'success' | 'error'; text: string } | null;
type Confirm = { action: 'publish' | 'republish' | 'delete'; version: ConfigVersionSummary } | null;

const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'config';

const toRows = (manifest: ConfigVersionsManifest): Row[] => [
  { version: manifest.published, kind: 'published' },
  ...(manifest.draft ? [{ version: manifest.draft, kind: 'draft' as const }] : []),
  ...manifest.archives.map((v) => ({ version: v, kind: 'archive' as const })),
];

/**
 * Config version management: publish the working draft, browse the archive history
 * of previously-published configs, and download/upload/rename/rollback/delete
 * versions. Edits are made in `SiteSettingsForm` (draft); this panel controls what
 * goes live via `configVersionService`. `refreshSignal` re-fetches when a sibling
 * edit form mutates the draft.
 */
export const ConfigVersionsPanel: React.FC<{ refreshSignal?: number }> = ({ refreshSignal }) => {
  const intl = useIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [rename, setRename] = useState<{ version: ConfigVersionSummary; value: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [importState, setImportState] = useState<{ config: SiteConfig; value: string } | null>(null);

  const reload = async () => {
    const manifest = await listVersions();
    setRows(toRows(manifest));
    setHasDraft(Boolean(manifest.draft));
  };

  useEffect(() => {
    let active = true;
    listVersions()
      .then((manifest) => {
        if (!active) return;
        setRows(toRows(manifest));
        setHasDraft(Boolean(manifest.draft));
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.versions.error.load' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [intl]);

  // Re-fetch when a sibling edit form (e.g. Site settings) mutates the draft.
  // Skips the initial mount, which the loader effect above already handles.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    let active = true;
    listVersions()
      .then((manifest) => { if (active) { setRows(toRows(manifest)); setHasDraft(Boolean(manifest.draft)); } })
      .catch(() => { /* keep the current view; explicit actions surface their own errors */ });
    return () => { active = false; };
  }, [refreshSignal]);

  /** Runs a mutating action, then refreshes the manifest and shows feedback. */
  const run = async (fn: () => Promise<void>, successId: string, errorId = 'page.manage.versions.error.generic') => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      await reload();
      setFeedback({ severity: 'success', text: intl.formatMessage({ id: successId }) });
      return true;
    } catch (err) {
      setFeedback({ severity: 'error', text: err instanceof Error ? err.message : intl.formatMessage({ id: errorId }) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (version: ConfigVersionSummary) => {
    setBusy(true);
    setFeedback(null);
    try {
      const config = await getVersionConfig(version.key);
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${sanitizeFilename(version.name)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ severity: 'error', text: err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.versions.error.generic' }) });
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setFeedback(null);
    try {
      const parsed = SiteConfigSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        setFeedback({ severity: 'error', text: intl.formatMessage({ id: 'page.manage.versions.import.errorInvalid' }) });
        return;
      }
      setImportState({ config: parsed.data, value: file.name.replace(/\.json$/i, '') });
    } catch {
      setFeedback({ severity: 'error', text: intl.formatMessage({ id: 'page.manage.versions.import.errorInvalid' }) });
    }
  };

  const confirmCopy = useMemo(() => {
    if (!confirm) return null;
    return {
      publish: { title: 'page.manage.versions.publish.confirmTitle', body: 'page.manage.versions.publish.confirmBody' },
      republish: { title: 'page.manage.versions.republish.confirmTitle', body: 'page.manage.versions.republish.confirmBody' },
      delete: { title: 'page.manage.versions.delete.confirmTitle', body: 'page.manage.versions.delete.confirmBody' },
    }[confirm.action];
  }, [confirm]);

  const runConfirm = async () => {
    if (!confirm) return;
    const { action, version } = confirm;
    setConfirm(null);
    if (action === 'publish') await run(() => publishDraft(), 'page.manage.versions.publish.success');
    else if (action === 'republish') await run(() => republishVersion(version.key), 'page.manage.versions.republish.success');
    else await run(() => deleteVersion(version.key), 'page.manage.versions.delete.success');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  const renderActions = (row: Row) => {
    const { version, kind } = row;
    return (
      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        {kind === 'archive' && (
          <Tooltip title={intl.formatMessage({ id: 'page.manage.versions.republish' })}>
            <span>
              <IconButton size="small" disabled={busy} onClick={() => setConfirm({ action: 'republish', version })} aria-label={intl.formatMessage({ id: 'page.manage.versions.republish' })}>
                <RepublishIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title={intl.formatMessage({ id: 'page.manage.versions.download' })}>
          <span>
            <IconButton size="small" disabled={busy} onClick={() => handleDownload(version)} aria-label={intl.formatMessage({ id: 'page.manage.versions.download' })}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={intl.formatMessage({ id: 'page.manage.versions.rename' })}>
          <span>
            <IconButton size="small" disabled={busy} onClick={() => setRename({ version, value: version.name })} aria-label={intl.formatMessage({ id: 'page.manage.versions.rename' })}>
              <RenameIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {kind === 'archive' && (
          <Tooltip title={intl.formatMessage({ id: 'page.manage.versions.delete' })}>
            <span>
              <IconButton size="small" color="error" disabled={busy} onClick={() => setConfirm({ action: 'delete', version })} aria-label={intl.formatMessage({ id: 'page.manage.versions.delete' })}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    );
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        <Typography variant="h6"><FormattedMessage id="page.manage.versions.title" /></Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ImportIcon />} disabled={busy} onClick={() => fileInputRef.current?.click()}>
            <FormattedMessage id="page.manage.versions.import" />
          </Button>
          <Tooltip title={hasDraft ? '' : intl.formatMessage({ id: 'page.manage.versions.noDraft' })}>
            <span>
              <Button variant="contained" startIcon={<PublishIcon />} disabled={busy || !hasDraft} onClick={() => setConfirm({ action: 'publish', version: rows.find((r) => r.kind === 'draft')!.version })}>
                <FormattedMessage id="page.manage.versions.publish" />
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.versions.subtitle" />
      </Typography>

      {feedback && (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)} sx={{ mb: 2 }}>
          {feedback.text}
        </Alert>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><FormattedMessage id="page.manage.versions.colName" /></TableCell>
            <TableCell><FormattedMessage id="page.manage.versions.colStatus" /></TableCell>
            <TableCell><FormattedMessage id="page.manage.versions.colDate" /></TableCell>
            <TableCell align="right"><FormattedMessage id="page.manage.versions.colActions" /></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.version.key} hover>
              <TableCell>{row.version.name}</TableCell>
              <TableCell>
                {row.kind === 'published' && <Chip size="small" color="success" label={intl.formatMessage({ id: 'page.manage.versions.publishedLabel' })} />}
                {row.kind === 'draft' && <Chip size="small" color="warning" label={intl.formatMessage({ id: 'page.manage.versions.draftLabel' })} />}
                {row.kind === 'archive' && <Chip size="small" variant="outlined" label={intl.formatMessage({ id: 'page.manage.versions.archiveLabel' })} />}
              </TableCell>
              <TableCell>
                {row.version.archivedAt ? intl.formatDate(row.version.archivedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </TableCell>
              <TableCell align="right">{renderActions(row)}</TableCell>
            </TableRow>
          ))}
          {rows.filter((r) => r.kind === 'archive').length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary"><FormattedMessage id="page.manage.versions.emptyArchives" /></Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileSelected} />

      {/* Rename dialog */}
      <Dialog open={rename !== null} onClose={() => setRename(null)} fullWidth maxWidth="xs">
        <DialogTitle><FormattedMessage id="page.manage.versions.rename.title" /></DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={intl.formatMessage({ id: 'page.manage.versions.rename.label' })}
            value={rename?.value ?? ''}
            onChange={(e) => setRename((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRename(null)}><FormattedMessage id="page.manage.versions.cancel" /></Button>
          <Button
            variant="contained"
            disabled={busy || !rename?.value.trim()}
            onClick={async () => {
              if (!rename) return;
              const { version, value } = rename;
              setRename(null);
              await run(() => renameVersion(version.key, value.trim()), 'page.manage.versions.rename.success');
            }}
          >
            <FormattedMessage id="page.manage.versions.confirm" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import name dialog */}
      <Dialog open={importState !== null} onClose={() => setImportState(null)} fullWidth maxWidth="xs">
        <DialogTitle><FormattedMessage id="page.manage.versions.import.title" /></DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}><FormattedMessage id="page.manage.versions.import.body" /></DialogContentText>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={intl.formatMessage({ id: 'page.manage.versions.import.nameLabel' })}
            value={importState?.value ?? ''}
            onChange={(e) => setImportState((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportState(null)}><FormattedMessage id="page.manage.versions.cancel" /></Button>
          <Button
            variant="contained"
            disabled={busy || !importState?.value.trim()}
            onClick={async () => {
              if (!importState) return;
              const { config, value } = importState;
              setImportState(null);
              await run(() => importConfig(value.trim(), config), 'page.manage.versions.import.success');
            }}
          >
            <FormattedMessage id="page.manage.versions.confirm" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm dialog (publish / re-publish / delete) */}
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirmCopy && <FormattedMessage id={confirmCopy.title} />}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmCopy && <FormattedMessage id={confirmCopy.body} values={{ name: confirm?.version.name }} />}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}><FormattedMessage id="page.manage.versions.cancel" /></Button>
          <Button variant="contained" color={confirm?.action === 'delete' ? 'error' : 'primary'} disabled={busy} onClick={runConfirm}>
            <FormattedMessage id="page.manage.versions.confirm" />
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
