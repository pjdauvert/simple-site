import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { CreateNewFolder as CreateNewFolderIcon } from '@mui/icons-material';
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
import {
  DeleteConfirmDialog,
  DropZone,
  FileCard,
  FolderChip,
  MediaBreadcrumbs,
  MediaTypeFilter,
  NewFolderDialog,
  UploadProgressPanel,
  matchesFilter,
  type UploadProgress,
  type UploadStatus,
} from '../../components/media';

type DeleteTarget =
  | { kind: 'file'; file: MediaFile }
  | { kind: 'folder'; folder: MediaFolder };

export const MediaPage: React.FC = () => {
  const intl = useIntl();

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

  // Uploads one entry, tracking its status. On success the V2 response IS
  // ImageKit's acknowledgment (the list index lags ~1–2 s), so the file is shown
  // immediately. The row is kept (success/error/canceled) until dismissed.
  const runUpload = useCallback(async (id: string, file: File, controller: AbortController) => {
    try {
      const media = await uploadMedia(
        file,
        currentPath,
        undefined,
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

    await Promise.allSettled(
      entries.map((entry) => runUpload(entry.id, entry.file, entry.controller)),
    );
  }, [runUpload]);

  const retryUpload = useCallback((item: UploadProgress) => {
    const controller = new AbortController();
    setUploads((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, percent: 0, status: 'uploading', controller } : u)),
    );
    runUpload(item.id, item.file, controller);
  }, [runUpload]);

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

      <MediaBreadcrumbs segments={segments} onNavigate={setCurrentPath} />

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
              <MediaTypeFilter value={filter} onChange={setFilter} />
            </Box>

            <DropZone onFiles={uploadFiles} />

            <UploadProgressPanel
              uploads={uploads}
              onCancel={(upload) => upload.controller.abort()}
              onRetry={retryUpload}
              onDismiss={() => setUploads([])}
            />

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

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        isFolder={deleteTarget?.kind === 'folder'}
        name={
          deleteTarget?.kind === 'folder'
            ? deleteTarget.folder.name
            : deleteTarget?.file.name ?? ''
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <NewFolderDialog
        open={newFolderOpen}
        value={newFolderName}
        loading={creatingFolder}
        onChange={setNewFolderName}
        onCancel={() => setNewFolderOpen(false)}
        onConfirm={handleCreateFolder}
      />
    </Box>
  );
};
