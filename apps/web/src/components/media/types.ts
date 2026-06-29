/** Lifecycle of a single upload row in the progress panel. */
export type UploadStatus = 'uploading' | 'success' | 'error' | 'canceled';

/** One file's upload, tracked from selection through to a final state. */
export interface UploadProgress {
  id: string;
  file: File;
  name: string;
  percent: number;
  status: UploadStatus;
  controller: AbortController;
}
