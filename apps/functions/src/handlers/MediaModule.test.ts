import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaModule } from './MediaModule';
import { ErrorCode } from '@simple-site/interfaces';
import { jsonRequest, makeContext, readJson, stubEnv, stubFetch } from './testing/handlerTestKit';

const IMAGEKIT_ENV: Record<string, string> = {
  IMAGEKIT_PRIVATE_KEY: 'private_test_key',
  IMAGEKIT_PUBLIC_KEY: 'public_test_key',
  IMAGEKIT_ROOT_DIR: '/root',
};

/** Media routes read the `:fileId` segment off the context. */
const withParams = (params: Record<string, string> = {}) => makeContext({ params });

describe('MediaModule', () => {
  beforeEach(() => stubEnv(IMAGEKIT_ENV));
  afterEach(() => vi.unstubAllGlobals());

  it('POST /api/media/upload-auth scopes the upload folder under the root + path', async () => {
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/upload-auth', 'POST', {
        fileName: 'pic.jpg',
        path: '/products',
        tags: ['a', 'b'],
      }),
      withParams(),
    );
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.data.publicKey).toBe('public_test_key');
    expect(typeof body.data.token).toBe('string');
    expect(body.data.uploadPayload).toMatchObject({
      fileName: 'pic.jpg',
      folder: '/root/products',
      useUniqueFileName: 'true',
      tags: 'a,b',
    });
  });

  it('defaults the upload folder to the root when no path is given', async () => {
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/upload-auth', 'POST', { fileName: 'pic.jpg' }),
      withParams(),
    );
    expect((await readJson(res)).data.uploadPayload.folder).toBe('/root');
  });

  it('returns a 500 configuration error when ImageKit keys are missing', async () => {
    stubEnv({});
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/upload-auth', 'POST', { fileName: 'pic.jpg' }),
      withParams(),
    );
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
  });

  it('GET /api/media returns folders + files and filters videos by mime', async () => {
    stubFetch(() => ({
      ok: true,
      status: 200,
      json: async () => [
        { type: 'folder', folderId: 'f1', name: 'products', folderPath: '/root/products' },
        { type: 'file', fileId: '1', name: 'a.png', filePath: '/root/a.png', url: 'https://ik/a.png', mime: 'image/png' },
        { type: 'file', fileId: '2', name: 'b.mp4', filePath: '/root/b.mp4', url: 'https://ik/b.mp4', mime: 'video/mp4' },
      ],
    }));

    const all = await new MediaModule().handle(jsonRequest('https://site.test/api/media', 'GET'), withParams());
    const allData = (await readJson(all)).data;
    expect(allData.folders).toEqual([{ folderId: 'f1', name: 'products', path: '/products' }]);
    expect(allData.files).toHaveLength(2);

    const videos = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media?type=video', 'GET'),
      withParams(),
    );
    const videoData = (await readJson(videos)).data;
    expect(videoData.files).toHaveLength(1);
    expect(videoData.files[0].fileId).toBe('2');
    expect(videoData.folders).toHaveLength(1); // folders shown regardless of filter
  });

  it('GET /api/media requests the resolved folder path', async () => {
    const fetchSpy = stubFetch(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => [] }));

    await new MediaModule().handle(
      jsonRequest('https://site.test/api/media?path=/products', 'GET'),
      withParams(),
    );
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    // Literal slashes preserved (ImageKit does not decode %2F).
    expect(calledUrl).toContain('path=/root/products');
  });

  it('POST /api/media/folder creates a folder under the resolved parent path', async () => {
    const fetchSpy = stubFetch(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 201, json: async () => ({}) }));

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/folder', 'POST', { name: 'new', path: '/products' }),
      withParams(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/folder');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ folderName: 'new', parentFolderPath: '/root/products' });
  });

  it('DELETE /api/media/folder deletes the resolved folder path', async () => {
    const fetchSpy = stubFetch(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 204, json: async () => ({}) }));

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/folder?path=/products', 'DELETE'),
      withParams(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/folder');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ folderPath: '/root/products' });
  });

  it('PUT /api/media/folder renames the resolved folder via a bulk job', async () => {
    const fetchSpy = stubFetch(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 202, json: async () => ({ jobId: 'job_1' }) }));

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/folder', 'PUT', { path: '/products', newName: 'goods' }),
      withParams(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/bulkJobs/renameFolder');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ folderPath: '/root/products', newFolderName: 'goods' });
  });

  it('PUT /api/media renames a file by its absolute path', async () => {
    const fetchSpy = stubFetch(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => ({}) }));

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media', 'PUT', { filePath: '/root/products/a.png', newFileName: 'b.png' }),
      withParams(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/files/rename');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ filePath: '/root/products/a.png', newFileName: 'b.png' });
  });

  it('DELETE /api/media/:fileId removes the file', async () => {
    const fetchSpy = stubFetch(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 204, json: async () => ({}) }));

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/file_123', 'DELETE'),
      withParams({ fileId: 'file_123' }),
    );
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.imagekit.io/v1/files/file_123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('maps an ImageKit 404 on delete to NOT_FOUND', async () => {
    stubFetch(() => ({ ok: false, status: 404, json: async () => ({}) }));
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/missing', 'DELETE'),
      withParams({ fileId: 'missing' }),
    );
    expect(res.status).toBe(404);
    expect((await readJson(res)).code).toBe(ErrorCode.NOT_FOUND);
  });

  it('rejects unsupported methods', async () => {
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media', 'PATCH'),
      withParams(),
    );
    expect(res.status).toBe(405);
  });
});
