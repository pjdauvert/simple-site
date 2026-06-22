import type {
  ApiResponseErrorPayload,
  ApiResponseSuccessPayload,
  MediaFile,
  MediaType,
  UploadAuthRequest,
  UploadAuthResponse,
} from '@simple-site/interfaces';
import { MediaListResponseSchema, UploadAuthResponseSchema } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Media service.
 *
 * Browse/delete go through our authenticated Netlify function (`/api/media`).
 * Uploads go browser → ImageKit directly (Upload File V2), authorized by a JWT
 * minted by `/api/media/upload-auth`. The ImageKit private key never reaches
 * the browser.
 */

/** ImageKit Upload File V2 endpoint. */
const IMAGEKIT_UPLOAD_V2_URL = 'https://upload.imagekit.io/api/v2/files/upload';

const unwrap = <T>(response: ApiResponseSuccessPayload<T> | ApiResponseErrorPayload): T => {
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return (response as ApiResponseSuccessPayload<T>).data;
};

/** Lists media, optionally filtered to images or videos. */
export const listMedia = async (type: MediaType = 'all'): Promise<MediaFile[]> => {
  const response = await apiService.get<MediaFile[]>(`media?type=${encodeURIComponent(type)}`);
  return MediaListResponseSchema.parse(unwrap(response));
};

/** Permanently deletes a media file by its ImageKit fileId. */
export const deleteMedia = async (fileId: string): Promise<void> => {
  const response = await apiService.delete(`media/${encodeURIComponent(fileId)}`);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};

/** Requests a short-lived V2 upload token + the exact payload to send. */
const getUploadAuth = async (fileName: string, tags?: string[]): Promise<UploadAuthResponse> => {
  const response = await apiService.post<UploadAuthRequest, UploadAuthResponse>('media/upload-auth', {
    fileName,
    tags,
  });
  return UploadAuthResponseSchema.parse(unwrap(response));
};

/** Uploads a single file directly to ImageKit (V2), reporting 0–100 progress. */
const uploadToImageKit = (
  file: File,
  auth: UploadAuthResponse,
  onProgress?: (percent: number) => void,
): Promise<void> =>
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
        resolve();
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

/** Orchestrates a single upload: fetch a token, then upload to ImageKit. */
export const uploadMedia = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> => {
  const auth = await getUploadAuth(file.name);
  await uploadToImageKit(file, auth, onProgress);
};
