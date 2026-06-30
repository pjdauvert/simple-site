/** Lifecycle of a single upload row in the progress panel. */
export type UploadStatus = 'uploading' | 'success' | 'error' | 'canceled';

/**
 * In-place deletion lifecycle of a media item. `pending` blurs/greys the item
 * and pulses a loader over it while ImageKit confirms the delete; `removing`
 * fades and shrinks it out before it is dropped from the list.
 */
export type DeletionPhase = 'pending' | 'removing';

/** One file's upload, tracked from selection through to a final state. */
export interface UploadProgress {
  id: string;
  file: File;
  name: string;
  percent: number;
  status: UploadStatus;
  controller: AbortController;
}
