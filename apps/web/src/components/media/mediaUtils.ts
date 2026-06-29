import type { MediaFile, MediaType } from '@simple-site/interfaces';

/** ImageKit classifies as "image" | "non-image"; use `mime` to detect video. */
export const isVideo = (file: MediaFile): boolean =>
  file.mime?.startsWith('video/') ?? file.fileType === 'non-image';

/** Whether a file passes the active type filter (folders are always shown). */
export const matchesFilter = (file: MediaFile, type: MediaType): boolean =>
  type === 'all' || (type === 'video' ? isVideo(file) : !isVideo(file));

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
