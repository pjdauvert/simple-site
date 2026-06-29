import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  ButtonBase,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  ContentCopy as ContentCopyIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Link as LinkIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MediaFile, MediaFolder, MediaType } from '@simple-site/interfaces';
import {
  createFolder,
  deleteFolder,
  deleteMedia,
  isUploadCanceled,
  listMedia,
  uploadMedia,
} from '../../services/mediaService';
import { Loader } from '../../components/Loader';

const isVideo = (file: MediaFile): boolean =>
  file.mime?.startsWith('video/') ?? file.fileType === 'non-image';

const matchesFilter = (file: MediaFile, type: MediaType): boolean =>
  type === 'all' || (type === 'video' ? isVideo(file) : !isVideo(file));

/** Uppercase file extension derived from the name, e.g. "photo.PNG" → "PNG". */
const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
};

/** Human-readable file size, e.g. 2_400_000 → "2.3 MB". */
const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

/** Video length as m:ss, e.g. 75 → "1:15". */
const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

type UploadStatus = 'uploading' | 'success' | 'error' | 'canceled';

interface UploadProgress {
  id: string;
  file: File;
  name: string;
  percent: number;
  status: UploadStatus;
  controller: AbortController;
}

type DeleteTarget =
  | { kind: 'file'; file: MediaFile }
  | { kind: 'folder'; folder: MediaFolder };

export const MediaPage: React.FC = () => {
  const intl = useIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MediaType>('all');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Bumps on every load so a slow response can't overwrite a newer one (latest wins).
  const requestIdRef = useRef(0);
  // id → expiry. ImageKit's list index lags a delete by ~1-2 s, so deleted ids are
  // filtered out of *every* re-list for a short window, not just the immediate one.
  const recentlyDeletedRef = useRef<Map<string, number>>(new Map());
  const DELETE_GRACE_MS = 5000;
  // Monotonic counter for unique upload-row ids (files can share a name).
  const uploadSeqRef = useRef(0);

  const loadMedia = useCallback(async (
    path: string,
    type: MediaType,
    options?: { deletedId?: string; keepPending?: boolean },
  ) => {
    const requestId = ++requestIdRef.current;
    if (options?.deletedId) {
      recentlyDeletedRef.current.set(options.deletedId, Date.now() + DELETE_GRACE_MS);
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listMedia(path, type);
      if (requestId !== requestIdRef.current) return; // superseded by a newer load

      // Drop ids whose grace window has lapsed, then hide the still-pending ones —
      // this keeps a just-deleted item gone across filter changes / navigation
      // while ImageKit's list index catches up.
      const now = Date.now();
      const deleted = recentlyDeletedRef.current;
      for (const [id, expiry] of deleted) if (expiry <= now) deleted.delete(id);

      const serverFolders = result.folders.filter((f) => !deleted.has(f.folderId));
      const serverFiles = result.files.filter((f) => !deleted.has(f.fileId));
      setFolders(serverFolders);
      setFiles((prev) => {
        if (!options?.keepPending) return serverFiles;
        // Same-folder refresh: re-add optimistic uploads the index hasn't indexed yet.
        const indexed = new Set(serverFiles.map((f) => f.fileId));
        const pending = prev.filter(
          (f) => !indexed.has(f.fileId) && !deleted.has(f.fileId) && matchesFilter(f, type),
        );
        return [...pending, ...serverFiles];
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.load' }));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    loadMedia(currentPath, filter);
  }, [currentPath, filter, loadMedia]);

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, next: MediaType | null) => {
    if (next) setFilter(next);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  // Uploads one entry, tracking its status. On success the V2 response IS
  // ImageKit's acknowledgment (the list index lags ~1–2 s), so the file is shown
  // immediately. The row is kept (success/error/canceled) until dismissed.
  const runUpload = useCallback(async (id: string, file: File, controller: AbortController) => {
    try {
      const media = await uploadMedia(
        file,
        currentPath,
        (percent) => setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, percent } : u))),
        controller.signal,
      );
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, percent: 100, status: 'success' } : u)));
      setFiles((prev) =>
        prev.some((f) => f.fileId === media.fileId) || !matchesFilter(media, filter) ? prev : [media, ...prev],
      );
    } catch (err) {
      const status: UploadStatus = isUploadCanceled(err) ? 'canceled' : 'error';
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
      if (status === 'error') {
        setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.upload' }));
      }
    }
  }, [currentPath, filter, intl]);

  const uploadFiles = useCallback(async (selected: File[]) => {
    if (selected.length === 0) return;

    const entries: UploadProgress[] = selected.map((file) => ({
      id: `upload-${(uploadSeqRef.current += 1)}`,
      file,
      name: file.name,
      percent: 0,
      status: 'uploading',
      controller: new AbortController(),
    }));
    setError(null);
    setUploads((prev) => [...prev, ...entries]);

    // Sequentially, so cancelling/failing one leaves the others (and finished ones) intact.
    for (const entry of entries) {
      if (entry.controller.signal.aborted) {
        setUploads((prev) => prev.map((u) => (u.id === entry.id ? { ...u, status: 'canceled' } : u)));
        continue;
      }
      await runUpload(entry.id, entry.file, entry.controller);
    }
  }, [runUpload]);

  const retryUpload = useCallback((item: UploadProgress) => {
    const controller = new AbortController();
    setUploads((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, percent: 0, status: 'uploading', controller } : u)),
    );
    runUpload(item.id, item.file, controller);
  }, [runUpload]);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-selecting the same file
    uploadFiles(selected);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = Array.from(event.dataTransfer.files).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/'),
    );
    uploadFiles(dropped);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Refresh the folder from the server once ImageKit acknowledges the delete;
      // `deletedId` keeps the removed item hidden while the list index catches up,
      // and `keepPending` preserves optimistic uploads not yet indexed.
      if (deleteTarget.kind === 'file') {
        const { fileId } = deleteTarget.file;
        await deleteMedia(fileId);
        setDeleteTarget(null);
        await loadMedia(currentPath, filter, { deletedId: fileId, keepPending: true });
      } else {
        const { folderId, path } = deleteTarget.folder;
        await deleteFolder(path);
        setDeleteTarget(null);
        await loadMedia(currentPath, filter, { deletedId: folderId, keepPending: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      await createFolder(name, currentPath);
      setNewFolderOpen(false);
      setNewFolderName('');
      // Refresh from the server once ImageKit has acknowledged the new folder
      // (keep optimistic uploads that the list index hasn't caught up with).
      await loadMedia(currentPath, filter, { keepPending: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
    } finally {
      setCreatingFolder(false);
    }
  };

  const segments = currentPath.split('/').filter(Boolean);

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        <FormattedMessage id="page.media.title" />
      </Typography>

      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          type="button"
          underline="hover"
          color={segments.length === 0 ? 'text.primary' : 'inherit'}
          onClick={() => setCurrentPath('')}
        >
          <FormattedMessage id="page.media.root" />
        </Link>
        {segments.map((segment, index) => {
          const path = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          return isLast ? (
            <Typography key={path} color="text.primary">{segment}</Typography>
          ) : (
            <Link
              key={path}
              component="button"
              type="button"
              underline="hover"
              color="inherit"
              onClick={() => setCurrentPath(path)}
            >
              {segment}
            </Link>
          );
        })}
      </Breadcrumbs>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* Folders — the New folder action sits before the folder list */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              <FormattedMessage id="page.media.foldersSection" />
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
              <Button variant="outlined" startIcon={<CreateNewFolderIcon />} onClick={() => setNewFolderOpen(true)}>
                <FormattedMessage id="page.media.newFolder" />
              </Button>
              {folders.map((folder) => (
                <FolderChip
                  key={folder.folderId}
                  folder={folder}
                  onOpen={() => setCurrentPath(folder.path)}
                  onDelete={() => setDeleteTarget({ kind: 'folder', folder })}
                />
              ))}
            </Box>
          </Box>

          {/* Files — filter in the header, then the drop zone, then the grid */}
          <Box>
            <Box
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="overline" color="text.secondary">
                <FormattedMessage id="page.media.filesSection" />
              </Typography>
              <ToggleButtonGroup value={filter} exclusive onChange={handleFilterChange} size="small">
                <ToggleButton value="all"><FormattedMessage id="page.media.filter.all" /></ToggleButton>
                <ToggleButton value="image"><FormattedMessage id="page.media.filter.images" /></ToggleButton>
                <ToggleButton value="video"><FormattedMessage id="page.media.filter.videos" /></ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box
              role="button"
              tabIndex={0}
              onClick={handleUploadClick}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleUploadClick();
                }
              }}
              onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
              }}
              onDrop={handleDrop}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                p: { xs: 3, sm: 4 },
                mb: 2,
                textAlign: 'center',
                cursor: 'pointer',
                color: dragActive ? 'primary.main' : 'text.secondary',
                border: '2px dashed',
                borderColor: dragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                bgcolor: dragActive ? 'action.hover' : 'transparent',
                transition: (theme) => theme.transitions.create(['border-color', 'background-color', 'color']),
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 40 }} />
              <Typography variant="body2"><FormattedMessage id="page.media.dropzone" /></Typography>
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={handleFilesSelected}
            />

            {uploads.length > 0 && (
              <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                {uploads.map((upload) => (
                  <Box
                    key={upload.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      '&:not(:last-of-type)': { mb: 1 },
                    }}
                  >
                    <Loader variant="determinate" progress={upload.percent} size={44} />
                    <Typography variant="body2" noWrap title={upload.name} sx={{ flexGrow: 1, minWidth: 0 }}>
                      {upload.name}
                    </Typography>
                    {upload.status === 'uploading' && (
                      <Tooltip title={intl.formatMessage({ id: 'page.media.cancelUpload' })}>
                        <IconButton
                          size="small"
                          aria-label={intl.formatMessage({ id: 'page.media.cancelUpload' })}
                          onClick={() => upload.controller.abort()}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {upload.status === 'success' && (
                      <CheckCircleIcon
                        color="success"
                        fontSize="small"
                        titleAccess={intl.formatMessage({ id: 'page.media.uploadSuccess' })}
                      />
                    )}
                    {(upload.status === 'error' || upload.status === 'canceled') && (
                      <Tooltip title={intl.formatMessage({ id: 'page.media.retry' })}>
                        <IconButton
                          size="small"
                          aria-label={intl.formatMessage({ id: 'page.media.retry' })}
                          onClick={() => retryUpload(upload)}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
                {uploads.every((u) => u.status !== 'uploading') && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button size="small" onClick={() => setUploads([])}>
                      <FormattedMessage id="page.media.dismiss" />
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {files.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                {files.map((file) => (
                  <FileCard key={file.fileId} item={file} onDelete={() => setDeleteTarget({ kind: 'file', file })} />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                <FormattedMessage id={filter === 'all' ? 'page.media.empty' : 'page.media.noMatch'} />
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Delete confirmation (file or folder) */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>
          <FormattedMessage
            id={deleteTarget?.kind === 'folder' ? 'page.media.deleteFolderConfirm.title' : 'page.media.deleteConfirm.title'}
          />
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage
              id={deleteTarget?.kind === 'folder' ? 'page.media.deleteFolderConfirm.body' : 'page.media.deleteConfirm.body'}
              values={{
                name: deleteTarget?.kind === 'folder' ? deleteTarget.folder.name : deleteTarget?.file.name ?? '',
              }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            <FormattedMessage id="page.media.cancel" />
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.media.confirm" />}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New folder */}
      <Dialog open={newFolderOpen} onClose={() => !creatingFolder && setNewFolderOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle><FormattedMessage id="page.media.newFolder.title" /></DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            variant="standard"
            label={intl.formatMessage({ id: 'page.media.newFolder.label' })}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderOpen(false)} disabled={creatingFolder}>
            <FormattedMessage id="page.media.cancel" />
          </Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={creatingFolder || newFolderName.trim().length === 0}
          >
            {creatingFolder ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.media.create" />}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface FolderChipProps {
  folder: MediaFolder;
  onOpen: () => void;
  onDelete: () => void;
}

/** A rounded-rectangle folder entry: folder icon + name (click to open), with a delete action. */
const FolderChip: React.FC<FolderChipProps> = ({ folder, onOpen, onDelete }) => {
  const intl = useIntl();
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        overflow: 'hidden',
      }}
    >
      <ButtonBase
        onClick={onOpen}
        aria-label={intl.formatMessage({ id: 'page.media.openFolder' }, { name: folder.name })}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, minWidth: 0 }}
      >
        <FolderIcon fontSize="small" color="action" />
        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{folder.name}</Typography>
      </ButtonBase>
      <IconButton
        size="small"
        aria-label={intl.formatMessage({ id: 'page.media.deleteFolder' })}
        onClick={onDelete}
        sx={{ mr: 0.5 }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

interface CopyButtonProps {
  value: string;
  label: string;
  copiedLabel: string;
  icon: React.ReactElement;
}

/** Copies `value` to the clipboard, flipping its tooltip to a confirmation for a moment. */
const CopyButton: React.FC<CopyButtonProps> = ({ value, label, copiedLabel, icon }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — silently ignore */
    }
  };
  return (
    <Tooltip title={copied ? copiedLabel : label}>
      <IconButton size="small" aria-label={label} onClick={handleCopy}>{icon}</IconButton>
    </Tooltip>
  );
};

interface FileCardProps {
  item: MediaFile;
  onDelete: () => void;
}

/**
 * Presentational media card: the thumbnail fills the top of the card; below it
 * sit the file name, a details line (extension, size, and image dimensions or
 * video length), and the copy-name / copy-URL / delete actions. Image
 * dimensions come from the listing; video length is read from the player
 * metadata since ImageKit does not return it.
 */
const FileCard: React.FC<FileCardProps> = ({ item, onDelete }) => {
  const intl = useIntl();
  const video = isVideo(item);
  const [meta, setMeta] = useState<{ width?: number; height?: number; duration?: number }>({
    width: item.width,
    height: item.height,
  });

  const detailParts = [extensionOf(item.name), formatBytes(item.size)];
  if (video) {
    detailParts.push(formatDuration(meta.duration));
  } else if (meta.width && meta.height) {
    detailParts.push(`${meta.width} × ${meta.height}`);
  }
  const details = detailParts.filter(Boolean).join('  ·  ');

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardActionArea
        component="a"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ position: 'relative' }}
      >
        {video ? (
          <CardMedia
            component="video"
            src={item.url}
            preload="metadata"
            muted
            onLoadedMetadata={(event: React.SyntheticEvent<HTMLVideoElement>) => {
              const el = event.currentTarget;
              setMeta({ width: el.videoWidth, height: el.videoHeight, duration: el.duration });
            }}
            sx={{ height: 160, objectFit: 'contain', bgcolor: 'action.hover' }}
          />
        ) : (
          <CardMedia
            component="img"
            image={`${item.url}?tr=w-400`}
            alt={item.name}
            sx={{ height: 160, objectFit: 'contain', bgcolor: 'action.hover' }}
          />
        )}
        {video && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: 'common.white',
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 44, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
          </Box>
        )}
      </CardActionArea>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography variant="subtitle2" noWrap title={item.name}>
          {item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {details}
        </Typography>
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        <CopyButton
          value={item.name}
          label={intl.formatMessage({ id: 'page.media.copyName' })}
          copiedLabel={intl.formatMessage({ id: 'page.media.copied' })}
          icon={<ContentCopyIcon fontSize="small" />}
        />
        <CopyButton
          value={item.url}
          label={intl.formatMessage({ id: 'page.media.copyUrl' })}
          copiedLabel={intl.formatMessage({ id: 'page.media.copied' })}
          icon={<LinkIcon fontSize="small" />}
        />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          aria-label={intl.formatMessage({ id: 'page.media.delete' })}
          onClick={onDelete}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
};
