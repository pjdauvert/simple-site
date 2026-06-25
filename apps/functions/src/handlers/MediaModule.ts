import type { Context } from '@netlify/functions';
import { BaseHandler } from './BaseHandler';
import type { RequestHandler } from '../types/server-types';
import { ErrorResponses } from '../errors/error';
import {
  type ImageKitEnv,
  IMAGEKIT_API_BASE,
  basicAuthHeader,
  getImageKitEnv,
  resolveFolderPath,
  signUploadToken,
} from './imagekit/imagekitClient';
import {
  type MediaFile,
  type MediaFolder,
  type MediaListResult,
  type MediaType,
  type UploadPayload,
  MediaFileSchema,
  MediaTypeSchema,
  CreateFolderRequestSchema,
  UploadAuthRequestSchema,
} from '@simple-site/interfaces';

const DEFAULT_LIMIT = 100;

interface ImageKitFolderItem {
  type?: string;
  folderId?: string;
  name?: string;
  folderPath?: string;
}

/**
 * Handles all `/api/media*` routes (admin-only, wrapped in AuthHandler). Every
 * path is relative to the configured root directory (IMAGEKIT_ROOT_DIR):
 *  - POST   /api/media/upload-auth  → mint a V2 upload token for a target folder
 *  - GET    /api/media?path=&type=  → list sub-folders + files of a folder
 *  - POST   /api/media/folder       → create a folder
 *  - DELETE /api/media/folder?path= → delete a folder (and its contents)
 *  - DELETE /api/media/:fileId      → delete a file
 */
export class MediaModule extends BaseHandler {
  /** Converts an absolute ImageKit folder path to one relative to the root dir. */
  private toRelative = (env: ImageKitEnv, absolutePath: string): string => {
    const rel = env.rootDir && absolutePath.startsWith(env.rootDir)
      ? absolutePath.slice(env.rootDir.length)
      : absolutePath;
    return rel.startsWith('/') ? rel : `/${rel}`;
  };

  private signUpload = async (request: Request, path: string): Promise<Response> => {
    if (request.headers.get('Content-Type') !== 'application/json') {
      throw ErrorResponses.invalidRequest('Invalid content type', path);
    }
    const { fileName, tags, path: relPath } = UploadAuthRequestSchema.parse(await request.json());
    const env = getImageKitEnv(path);

    const uploadPayload: UploadPayload = {
      fileName,
      folder: resolveFolderPath(env, relPath, path),
      useUniqueFileName: 'true',
      ...(tags && tags.length > 0 ? { tags: tags.join(',') } : {}),
    };

    const { token, expire } = signUploadToken(uploadPayload, env);
    return this.createSuccessResponse({ token, expire, publicKey: env.publicKey, uploadPayload });
  };

  private listMedia = async (url: URL, path: string): Promise<Response> => {
    const env = getImageKitEnv(path);
    const type = MediaTypeSchema.catch('all').parse(url.searchParams.get('type') ?? 'all');
    const folderPath = resolveFolderPath(env, url.searchParams.get('path') ?? '', path);

    const query = new URLSearchParams({
      type: 'all',
      limit: url.searchParams.get('limit') ?? String(DEFAULT_LIMIT),
      skip: url.searchParams.get('skip') ?? '0',
    });
    // ImageKit's list API does NOT decode %2F, so the folder path must keep
    // literal slashes — encode segment names but preserve the separators. The
    // account root is listed by omitting `path` entirely.
    const pathParam = encodeURIComponent(folderPath).replace(/%2F/g, '/');
    const endpoint =
      `${IMAGEKIT_API_BASE}/v1/files?${query.toString()}` + (folderPath === '/' ? '' : `&path=${pathParam}`);

    const response = await fetch(endpoint, {
      headers: { Authorization: basicAuthHeader(env.privateKey), Accept: 'application/json' },
    });
    if (!response.ok) throw await this.mapImageKitError(response, 'listing media', path);

    const raw = (await response.json()) as ImageKitFolderItem[];

    const folders: MediaFolder[] = raw
      .filter((item) => item.type === 'folder' && item.folderId && item.folderPath)
      .map((item) => ({
        folderId: item.folderId as string,
        name: item.name ?? (item.folderPath as string).split('/').pop() ?? '',
        path: this.toRelative(env, item.folderPath as string),
      }));

    let files: MediaFile[] = raw
      .filter((item) => item.type !== 'folder')
      .map((item) => MediaFileSchema.safeParse(item))
      .filter((r): r is { success: true; data: MediaFile } => r.success)
      .map((r) => r.data);

    files = filterByType(files, type);

    return this.createSuccessResponse<MediaListResult>({ folders, files });
  };

  private createFolder = async (request: Request, path: string): Promise<Response> => {
    if (request.headers.get('Content-Type') !== 'application/json') {
      throw ErrorResponses.invalidRequest('Invalid content type', path);
    }
    const { name, path: relPath } = CreateFolderRequestSchema.parse(await request.json());
    const env = getImageKitEnv(path);

    const response = await fetch(`${IMAGEKIT_API_BASE}/v1/folder`, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(env.privateKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ folderName: name, parentFolderPath: resolveFolderPath(env, relPath, path) }),
    });
    if (!response.ok) throw await this.mapImageKitError(response, 'creating folder', path);

    return this.createSuccessResponse({ message: 'Folder created successfully' });
  };

  private deleteFolder = async (url: URL, path: string): Promise<Response> => {
    const env = getImageKitEnv(path);
    const relPath = url.searchParams.get('path') ?? '';
    if (!relPath.trim()) throw ErrorResponses.invalidRequest('Missing folder path', path);

    const response = await fetch(`${IMAGEKIT_API_BASE}/v1/folder`, {
      method: 'DELETE',
      headers: {
        Authorization: basicAuthHeader(env.privateKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ folderPath: resolveFolderPath(env, relPath, path) }),
    });
    if (!response.ok) throw await this.mapImageKitError(response, 'deleting folder', path);

    return this.createSuccessResponse({ message: 'Folder deleted successfully' });
  };

  private deleteFile = async (context: Context, path: string): Promise<Response> => {
    const env = getImageKitEnv(path);
    const fileId = (context.params?.fileId ?? '').trim();
    if (!fileId) throw ErrorResponses.invalidRequest('Missing file id', path);

    const response = await fetch(`${IMAGEKIT_API_BASE}/v1/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: basicAuthHeader(env.privateKey), Accept: 'application/json' },
    });
    if (!response.ok) throw await this.mapImageKitError(response, `deleting media ${fileId}`, path);

    return this.createSuccessResponse({ message: 'Media deleted successfully' });
  };

  private mapImageKitError = async (response: Response, action: string, path: string) => {
    if (response.status === 401 || response.status === 403) return ErrorResponses.invalidToken(path);
    if (response.status === 404) return ErrorResponses.notFound('Media', path);
    return ErrorResponses.internalError(`ImageKit request failed while ${action} (${response.status})`, path);
  };

  override handle: RequestHandler = async (request, context) => {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (request.method === 'POST' && path.endsWith('/upload-auth')) {
        return await this.signUpload(request, path);
      }
      if (request.method === 'POST' && path.endsWith('/folder')) {
        return await this.createFolder(request, path);
      }
      if (request.method === 'DELETE' && path.endsWith('/folder')) {
        return await this.deleteFolder(url, path);
      }
      if (request.method === 'GET' && path === '/api/media') {
        return await this.listMedia(url, path);
      }
      if (request.method === 'DELETE') {
        return await this.deleteFile(context, path);
      }
      throw ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST', 'DELETE'], path);
    } catch (error) {
      return this.handleError(error, path);
    }
  };
}

/** Narrows a file list to the requested type. "video" is detected by MIME. */
const filterByType = (files: MediaFile[], type: MediaType): MediaFile[] => {
  if (type === 'image') return files.filter((f) => f.mime?.startsWith('image/') ?? f.fileType === 'image');
  if (type === 'video') return files.filter((f) => f.mime?.startsWith('video/'));
  return files;
};
