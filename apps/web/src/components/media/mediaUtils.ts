import type { MediaFile, MediaFolder, MediaType } from '@simple-site/interfaces';
import type { FileSortKey, SortDir } from './types';

/** ImageKit classifies as "image" | "non-image"; use `mime` to detect video. */
export const isVideo = (file: MediaFile): boolean =>
  file.mime?.startsWith('video/') ?? file.fileType === 'non-image';

/** Whether a file passes the active type filter (folders are always shown). */
export const matchesFilter = (file: MediaFile, type: MediaType): boolean =>
  type === 'all' || (type === 'video' ? isVideo(file) : !isVideo(file));

/** Folders are always listed alphabetically by name (locale-aware, case-insensitive). */
export const sortFolders = (folders: MediaFolder[]): MediaFolder[] =>
  [...folders].sort((a, b) => a.name.localeCompare(b.name));

/** Mirrors ImageKit's file-name rule: keep alphanumerics, `.`, `_`, `-`; the rest → `_`. */
export const sanitizeFileName = (name: string): string => name.trim().replace(/[^a-zA-Z0-9._-]/g, '_');

/** Mirrors ImageKit's folder-name rule: keep letters/numbers (any language) and `-`; the rest → `_`. */
export const sanitizeFolderName = (name: string): string => name.trim().replace(/[^\p{L}\p{N}-]/gu, '_');

/** Swaps the last `/`-segment of a path/URL for `newName` (keeps the parent prefix). */
const swapLastSegment = (value: string, newName: string): string =>
  value.slice(0, value.lastIndexOf('/') + 1) + newName;

/**
 * Optimistic rename of a file: updates its name and the derived `filePath`/`url`
 * so the grid reflects the change at once (ImageKit's rename response carries no
 * file object, and the list index lags, so we apply it locally).
 */
export const renameFileLocally = (file: MediaFile, newName: string): MediaFile => ({
  ...file,
  name: newName,
  filePath: swapLastSegment(file.filePath, newName),
  url: swapLastSegment(file.url, newName),
});

/** Optimistic rename of a folder: updates its name and the derived relative `path`. */
export const renameFolderLocally = (folder: MediaFolder, newName: string): MediaFolder => ({
  ...folder,
  name: newName,
  path: swapLastSegment(folder.path, newName),
});

/**
 * Numeric key for a file's sort field. Missing values become `Infinity` so they
 * sort to the end in ascending order — which is what keeps a just-uploaded file
 * (no server `createdAt` yet) at the end of the default creation-date sort.
 */
const fileSortValue = (file: MediaFile, key: Exclude<FileSortKey, 'name'>): number => {
  if (key === 'createdAt') {
    const time = file.createdAt ? Date.parse(file.createdAt) : NaN;
    return Number.isNaN(time) ? Infinity : time;
  }
  return file[key] ?? Infinity;
};

/**
 * Sorts files by the chosen field and direction, with the name as a stable
 * tie-breaker. Defaults to `createdAt` ascending so newly uploaded files land at
 * the end of the list. Missing values always sort to the end in ascending order.
 */
export const sortFiles = (files: MediaFile[], key: FileSortKey, dir: SortDir): MediaFile[] => {
  const factor = dir === 'asc' ? 1 : -1;
  return [...files].sort((a, b) => {
    if (key === 'name') return factor * a.name.localeCompare(b.name);
    const av = fileSortValue(a, key);
    const bv = fileSortValue(b, key);
    const diff = av === bv ? 0 : av - bv;
    return diff !== 0 ? factor * diff : a.name.localeCompare(b.name);
  });
};

/** Uppercase file extension derived from the name, e.g. "photo.PNG" → "PNG". */
export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
};

/** Human-readable file size, e.g. 2_400_000 → "2.3 MB". */
export const formatBytes = (bytes?: number): string => {
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
export const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
