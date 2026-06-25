import type {
  ApiResponseErrorPayload,
  ApiResponseSuccessPayload,
  CreateFolderRequest,
  MediaFile,
  MediaListResult,
  MediaType,
  UploadAuthRequest,
  UploadAuthResponse,
} from '@simple-site/interfaces';
import { MediaFileSchema, MediaListResultSchema, UploadAuthResponseSchema } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Media service.
 *
 * Browse/delete and folder operations go through our authenticated Netlify
 * function (`/api/media*`). Uploads go browser → ImageKit directly (Upload File
 * V2), authorized by a JWT minted by `/api/media/upload-auth`. All paths are
 * relative to the server-side root directory; the private key never reaches the
 * browser.
 */

/** ImageKit Upload File V2 endpoint. */
const IMAGEKIT_UPLOAD_V2_URL = 'https://upload.imagekit.io/api/v2/files/upload';

const unwrap = <T>(response: ApiResponseSuccessPayload<T> | ApiResponseErrorPayload): T => {
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return (response as ApiResponseSuccessPayload<T>).data;
};

/** Lists the sub-folders and files of a folder (relative to the root dir). */
export const listMedia = async (path = '', type: MediaType = 'all'): Promise<MediaListResult> => {
  const query = new URLSearchParams({ type });
  if (path) query.set('path', path);
  const response = await apiService.get<MediaListResult>(`media?${query.toString()}`);
  return MediaListResultSchema.parse(unwrap(response));
};

/** Permanently deletes a media file by its ImageKit fileId. */
export const deleteMedia = async (fileId: string): Promise<void> => {
  const response = await apiService.delete(`media/${encodeURIComponent(fileId)}`);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};

/** Creates a folder `name` inside `path` (relative to the root dir). */
export const createFolder = async (name: string, path = ''): Promise<void> => {
  const response = await apiService.post<CreateFolderRequest, { message: string }>('media/folder', {
    name,
    path,
  });
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};

/** Deletes a folder and all its contents (path relative to the root dir). */
export const deleteFolder = async (path: string): Promise<void> => {
  const response = await apiService.delete(`media/folder?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};

/** Requests a short-lived V2 upload token + the exact payload to send. */
const getUploadAuth = async (
  fileName: string,
  path?: string,
  tags?: string[],
): Promise<UploadAuthResponse> => {
  const response = await apiService.post<UploadAuthRequest, UploadAuthResponse>('media/upload-auth', {
    fileName,
    path,
    tags,
  });
  return UploadAuthResponseSchema.parse(unwrap(response));
};

/** Maps an ImageKit V2 upload response to a MediaFile (response uses `thumbnailUrl`). */
const toMediaFile = (raw: Record<string, unknown>): MediaFile =>
  MediaFileSchema.parse({
    fileId: raw.fileId,
    name: raw.name,
    filePath: raw.filePath,
    url: raw.url,
    thumbnail: raw.thumbnailUrl ?? raw.thumbnail,
    fileType: raw.fileType,
    mime: raw.mime,
    height: raw.height,
    width: raw.width,
    size: raw.size,
  });

/**
 * Uploads a single file directly to ImageKit (V2), reporting 0–100 progress.
 * Resolves with the uploaded asset so the UI can display it immediately
 * (ImageKit's list index is eventually consistent).
 */
const uploadToImageKit = (
  file: File,
  auth: UploadAuthResponse,
  onProgress?: (percent: number) => void,
): Promise<MediaFile> =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    // Echo the signed payload verbatim — V2 verifies the whole request against the token.
    Object.entries(auth.uploadPayload).forEach(([key, value]) => {
      if (value !== undefined) formData.append(key, value);
    });
    formData.append('token', auth.token);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', IMAGEKIT_UPLOAD_V2_URL);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(toMediaFile(JSON.parse(xhr.responseText)));
        } catch {
          reject(new Error('Upload succeeded but the response could not be parsed'));
        }
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed?.message) message = parsed.message;
      } catch {
        /* keep default message */
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Upload failed: network error'));
    xhr.send(formData);
  });

/** Orchestrates a single upload into `path`: fetch a token, then upload to ImageKit. */
export const uploadMedia = async (
  file: File,
  path?: string,
  onProgress?: (percent: number) => void,
): Promise<MediaFile> => {
  const auth = await getUploadAuth(file.name, path);
  return uploadToImageKit(file, auth, onProgress);
};
