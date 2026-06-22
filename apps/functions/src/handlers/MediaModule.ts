import type { Context } from '@netlify/functions';
import { BaseHandler } from './BaseHandler';
import type { RequestHandler } from '../types/server-types';
import { ErrorResponses } from '../errors/error';
import {
  type MediaFile,
  type MediaType,
  type UploadPayload,
  MediaFileSchema,
  MediaTypeSchema,
  UploadAuthRequestSchema,
} from '@simple-site/interfaces';
import {
  IMAGEKIT_API_BASE,
  basicAuthHeader,
  getImageKitEnv,
  signUploadToken,
} from './imagekit/imagekitClient';

const UPLOAD_FOLDER = '/media';
const DEFAULT_LIMIT = 50;

/** Maps the UI media filter to the ImageKit Management API `fileType` query value. */
const fileTypeQuery = (type: MediaType): string | undefined => {
  if (type === 'image') return 'image';
  if (type === 'video') return 'non-image';
  return undefined;
};

/**
 * Handles all `/api/media*` routes (admin-only, wrapped in AuthHandler):
 *  - POST   /api/media/upload-auth  → mint a V2 upload token
 *  - GET    /api/media              → list media via the Management API
 *  - DELETE /api/media/:fileId      → delete a file via the Management API
 */
export class MediaModule extends BaseHandler {
  private signUpload = async (request: Request, path: string): Promise<Response> => {
    if (request.headers.get('Content-Type') !== 'application/json') {
      throw ErrorResponses.invalidRequest('Invalid content type', path);
    }
    const { fileName, tags } = UploadAuthRequestSchema.parse(await request.json());
    const env = getImageKitEnv(path);

    const uploadPayload: UploadPayload = {
      fileName,
      folder: UPLOAD_FOLDER,
      useUniqueFileName: 'true',
      ...(tags && tags.length > 0 ? { tags: tags.join(',') } : {}),
    };

    const { token, expire } = signUploadToken(uploadPayload, env);
    return this.createSuccessResponse({ token, expire, publicKey: env.publicKey, uploadPayload });
  };

  private listMedia = async (url: URL, path: string): Promise<Response> => {
    const env = getImageKitEnv(path);

    const type = MediaTypeSchema.catch('all').parse(url.searchParams.get('type') ?? 'all');
    const limit = url.searchParams.get('limit') ?? String(DEFAULT_LIMIT);
    const skip = url.searchParams.get('skip') ?? '0';
    const searchQuery = url.searchParams.get('searchQuery');

    const query = new URLSearchParams({ type: 'file', limit, skip });
    const fileType = fileTypeQuery(type);
    if (fileType) query.set('fileType', fileType);
    if (searchQuery) query.set('searchQuery', searchQuery);

    const response = await fetch(`${IMAGEKIT_API_BASE}/v1/files?${query.toString()}`, {
      headers: { Authorization: basicAuthHeader(env.privateKey), Accept: 'application/json' },
    });

    if (!response.ok) throw this.mapImageKitError(response.status, 'listing media', path);

    const raw = (await response.json()) as unknown[];
    let files: MediaFile[] = raw
      .map((item) => MediaFileSchema.safeParse(item))
      .filter((r): r is { success: true; data: MediaFile } => r.success)
      .map((r) => r.data);

    // "non-image" includes any non-image asset; narrow to actual videos for the UI.
    if (type === 'video') files = files.filter((f) => f.mime?.startsWith('video/'));

    return this.createSuccessResponse<MediaFile[]>(files);
  };

  private deleteMedia = async (context: Context, path: string): Promise<Response> => {
    const env = getImageKitEnv(path);
    const fileId = (context.params?.fileId ?? '').trim();
    if (!fileId) throw ErrorResponses.invalidRequest('Missing file id', path);

    const response = await fetch(`${IMAGEKIT_API_BASE}/v1/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: basicAuthHeader(env.privateKey), Accept: 'application/json' },
    });

    if (!response.ok) throw this.mapImageKitError(response.status, `deleting media ${fileId}`, path);

    return this.createSuccessResponse({ message: 'Media deleted successfully' });
  };

  private mapImageKitError = (status: number, action: string, path: string) => {
    if (status === 401 || status === 403) return ErrorResponses.invalidToken(path);
    if (status === 404) return ErrorResponses.notFound('Media', path);
    return ErrorResponses.internalError(`ImageKit request failed while ${action} (${status})`, path);
  };

  override handle: RequestHandler = async (request, context) => {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (request.method === 'POST' && path.endsWith('/upload-auth')) {
        return await this.signUpload(request, path);
      }
      if (request.method === 'GET' && path === '/api/media') {
        return await this.listMedia(url, path);
      }
      if (request.method === 'DELETE') {
        return await this.deleteMedia(context, path);
      }
      throw ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST', 'DELETE'], path);
    } catch (error) {
      return this.handleError(error, path);
    }
  };
}
