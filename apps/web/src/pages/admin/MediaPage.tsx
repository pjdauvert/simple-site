import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Collapse, Typography } from '@mui/material';
import { CreateNewFolder as CreateNewFolderIcon, DeleteSweep as DeleteSweepIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MediaFile, MediaFolder, MediaType } from '@simple-site/interfaces';
import {
  createFolder,
  deleteFolder,
  deleteMedia,
  isUploadCanceled,
  listMedia,
  renameFolder,
  renameMedia,
  uploadMedia,
} from '../../services/mediaService';
import {
  DeleteConfirmDialog,
  DropZone,
  FileCard,
  FolderChip,
  MediaBreadcrumbs,
  MediaSortControl,
  MediaTypeFilter,
  NewFolderDialog,
  RenameDialog,
  UploadProgressPanel,
  matchesFilter,
  renameFileLocally,
  renameFolderLocally,
  sanitizeFileName,
  sanitizeFolderName,
  sortFiles,
  sortFolders,
  type DeletionPhase,
  type FileSortKey,
  type SortDir,
  type UploadProgress,
  type UploadStatus,
} from '../../components/media';
import { useNotifications } from '../../hooks/useNotifications';

/** A file or folder targeted by an action (delete or rename). */
type ItemTarget =
  | { kind: 'file'; file: MediaFile }
  | { kind: 'folder'; folder: MediaFolder };

export const MediaPage: React.FC = () => {
  const intl = useIntl();
  const notify = useNotifications();

  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MediaType>('all');
  const [sortKey, setSortKey] = useState<FileSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ItemTarget | null>(null);
  // id → in-place deletion phase. A deleted item stays mounted (blurred + pulsing,
  // then fading out) instead of the list refreshing; it's dropped once it removes.
  const [deletions, setDeletions] = useState<Record<string, DeletionPhase>>({});
  // Multi-select of file ids for bulk actions; reset on filter/navigation change.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ItemTarget | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
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
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.load' }));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [intl, notify]);

  useEffect(() => {
    loadMedia(currentPath, filter);
  }, [currentPath, filter, loadMedia]);

  // A filter change or folder navigation resets the multi-select.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPath, filter]);

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
      // Append (not prepend): with the default creation-date sort, a fresh upload
      // (no server `createdAt` yet) sorts to the end, so it shows up last.
      setFiles((prev) =>
        prev.some((f) => f.fileId === media.fileId) || !matchesFilter(media, filter) ? prev : [...prev, media],
      );
    } catch (err) {
      const status: UploadStatus = isUploadCanceled(err) ? 'canceled' : 'error';
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
      if (status === 'error') {
        notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.upload' }));
      }
    }
  }, [currentPath, filter, intl, notify]);

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

  const setDeletionPhase = (id: string, phase: DeletionPhase | null) => {
    setDeletions((prev) => {
      if (phase === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: phase };
    });
  };

  const toggleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Drop a fully-removed item from the list once its fade-out/minimize has played.
  const handleRemoved = (target: ItemTarget['kind'], id: string) => {
    if (target === 'file') {
      setFiles((prev) => prev.filter((f) => f.fileId !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setFolders((prev) => prev.filter((f) => f.folderId !== id));
    }
    setDeletionPhase(id, null);
  };

  // Deletes one file in place: it blurs + pulses (`pending`) until ImageKit
  // acknowledges, then fades + minimizes (`removing`) before `handleRemoved`
  // drops it — no full list refresh. Shared by single and bulk delete.
  const deleteFileInPlace = (id: string) => {
    setDeletionPhase(id, 'pending');
    void (async () => {
      try {
        await deleteMedia(id);
        // Keep the id hidden if any later re-list runs before ImageKit's index
        // catches up (e.g. a filter change or folder creation), then animate out.
        recentlyDeletedRef.current.set(id, Date.now() + DELETE_GRACE_MS);
        setDeletionPhase(id, 'removing');
      } catch (err) {
        setDeletionPhase(id, null);
        notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
      }
    })();
  };

  // Close the dialog right away, then delete in place (see `deleteFileInPlace`).
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.kind === 'file') {
      deleteFileInPlace(target.file.fileId);
      return;
    }

    const { folderId, path } = target.folder;
    setDeletionPhase(folderId, 'pending');
    void (async () => {
      try {
        await deleteFolder(path);
        recentlyDeletedRef.current.set(folderId, Date.now() + DELETE_GRACE_MS);
        setDeletionPhase(folderId, 'removing');
      } catch (err) {
        setDeletionPhase(folderId, null);
        notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
      }
    })();
  };

  // Close the confirm, clear the selection, then animate each selected file out.
  const handleConfirmBulkDelete = () => {
    const ids = [...selectedIds];
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    ids.forEach(deleteFileInPlace);
  };

  // Open the rename dialog pre-filled with the item's current name.
  const openRename = (target: ItemTarget) => {
    setRenameTarget(target);
    setRenameValue(target.kind === 'file' ? target.file.name : target.folder.name);
  };

  // Rename via ImageKit, then update the item in place (the rename response has no
  // file object and the list index lags, so the new name is applied locally and the
  // sort re-orders if needed). A no-op rename just closes the dialog.
  const handleConfirmRename = async () => {
    if (!renameTarget) return;
    const target = renameTarget;
    const isFile = target.kind === 'file';
    const newName = isFile ? sanitizeFileName(renameValue) : sanitizeFolderName(renameValue);
    const currentName = isFile ? target.file.name : target.folder.name;
    if (!newName || newName === currentName) {
      setRenameTarget(null);
      return;
    }

    setRenaming(true);
    try {
      if (isFile) {
        const { fileId, filePath } = target.file;
        await renameMedia(filePath, newName);
        setFiles((prev) => prev.map((f) => (f.fileId === fileId ? renameFileLocally(f, newName) : f)));
      } else {
        const { folderId, path } = target.folder;
        await renameFolder(path, newName);
        setFolders((prev) => prev.map((f) => (f.folderId === folderId ? renameFolderLocally(f, newName) : f)));
      }
      notify.success(intl.formatMessage({ id: 'page.media.renamed' }));
      setRenameTarget(null);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
    } finally {
      setRenaming(false);
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
      notify.success(intl.formatMessage({ id: 'page.media.created' }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
    } finally {
      setCreatingFolder(false);
    }
  };

  const segments = currentPath.split('/').filter(Boolean);

  // Folders always alphabetical; files by the chosen field/direction (default:
  // creation date ascending, so freshly uploaded files appear at the end).
  const sortedFolders = useMemo(() => sortFolders(folders), [folders]);
  const sortedFiles = useMemo(() => sortFiles(files, sortKey, sortDir), [files, sortKey, sortDir]);

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        <FormattedMessage id="page.media.title" />
      </Typography>

      <MediaBreadcrumbs segments={segments} onNavigate={setCurrentPath} />

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
              {sortedFolders.map((folder, i) => (
                <FolderChip
                  key={folder.folderId}
                  folder={folder}
                  index={i}
                  onOpen={() => setCurrentPath(folder.path)}
                  onRename={() => openRename({ kind: 'folder', folder })}
                  onDelete={() => setDeleteTarget({ kind: 'folder', folder })}
                  deletionPhase={deletions[folder.folderId]}
                  onRemoved={() => handleRemoved('folder', folder.folderId)}
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                <MediaSortControl
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSortKeyChange={setSortKey}
                  onSortDirChange={setSortDir}
                />
                <MediaTypeFilter value={filter} onChange={setFilter} />
              </Box>
            </Box>

            {/* The selection banner smoothly takes the drop zone's place while any
                file is selected, and the drop zone slides back once none are. */}
            <Collapse in={selectedIds.size === 0} unmountOnExit>
              <DropZone onFiles={uploadFiles} />
            </Collapse>
            <Collapse in={selectedIds.size > 0} unmountOnExit>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: 'action.selected',
                }}
              >
                <Typography variant="body2">
                  <FormattedMessage id="page.media.selectedCount" values={{ count: selectedIds.size }} />
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" onClick={() => setSelectedIds(new Set())}>
                  <FormattedMessage id="page.media.clearSelection" />
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <FormattedMessage id="page.media.deleteSelected" />
                </Button>
              </Box>
            </Collapse>

            <UploadProgressPanel
              uploads={uploads}
              onCancel={(upload) => upload.controller.abort()}
              onRetry={retryUpload}
              onDismiss={() => setUploads([])}
            />

            {sortedFiles.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                {sortedFiles.map((file, i) => (
                  <FileCard
                    key={file.fileId}
                    item={file}
                    index={i}
                    selected={selectedIds.has(file.fileId)}
                    onSelectChange={(sel) => toggleSelect(file.fileId, sel)}
                    onRename={() => openRename({ kind: 'file', file })}
                    onDelete={() => setDeleteTarget({ kind: 'file', file })}
                    deletionPhase={deletions[file.fileId]}
                    onRemoved={() => handleRemoved('file', file.fileId)}
                  />
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
        loading={false}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        count={selectedIds.size}
        loading={false}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />

      <RenameDialog
        open={Boolean(renameTarget)}
        isFolder={renameTarget?.kind === 'folder'}
        value={renameValue}
        loading={renaming}
        onChange={setRenameValue}
        onCancel={() => setRenameTarget(null)}
        onConfirm={handleConfirmRename}
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
