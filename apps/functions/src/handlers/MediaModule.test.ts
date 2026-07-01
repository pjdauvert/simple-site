import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { MediaModule } from './MediaModule';
import { ErrorCode } from '@simple-site/interfaces';

const ENV: Record<string, string> = {
  IMAGEKIT_PRIVATE_KEY: 'private_test_key',
  IMAGEKIT_PUBLIC_KEY: 'public_test_key',
  IMAGEKIT_ROOT_DIR: '/root',
};

const stubEnv = (env: Record<string, string | undefined> = ENV) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

const mockFetch = (impl: (url: string, init?: RequestInit) => unknown) =>
  vi.stubGlobal('fetch', vi.fn(impl as never));

const makeContext = (params: Record<string, string> = {}): Context =>
  ({ params } as unknown as Context);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = async (res: Response): Promise<any> => res.json();

const jsonRequest = (url: string, method: string, body?: unknown) =>
  new Request(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

describe('MediaModule', () => {
  beforeEach(() => stubEnv());
  afterEach(() => vi.unstubAllGlobals());

  it('POST /api/media/upload-auth scopes the upload folder under the root + path', async () => {
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/upload-auth', 'POST', {
        fileName: 'pic.jpg',
        path: '/products',
        tags: ['a', 'b'],
      }),
      makeContext(),
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
      makeContext(),
    );
    expect((await readJson(res)).data.uploadPayload.folder).toBe('/root');
  });

  it('returns a 500 configuration error when ImageKit keys are missing', async () => {
    stubEnv({});
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/upload-auth', 'POST', { fileName: 'pic.jpg' }),
      makeContext(),
    );
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
  });

  it('GET /api/media returns folders + files and filters videos by mime', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      json: async () => [
        { type: 'folder', folderId: 'f1', name: 'products', folderPath: '/root/products' },
        { type: 'file', fileId: '1', name: 'a.png', filePath: '/root/a.png', url: 'https://ik/a.png', mime: 'image/png' },
        { type: 'file', fileId: '2', name: 'b.mp4', filePath: '/root/b.mp4', url: 'https://ik/b.mp4', mime: 'video/mp4' },
      ],
    }));

    const all = await new MediaModule().handle(jsonRequest('https://site.test/api/media', 'GET'), makeContext());
    const allData = (await readJson(all)).data;
    expect(allData.folders).toEqual([{ folderId: 'f1', name: 'products', path: '/products' }]);
    expect(allData.files).toHaveLength(2);

    const videos = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media?type=video', 'GET'),
      makeContext(),
    );
    const videoData = (await readJson(videos)).data;
    expect(videoData.files).toHaveLength(1);
    expect(videoData.files[0].fileId).toBe('2');
    expect(videoData.folders).toHaveLength(1); // folders shown regardless of filter
  });

  it('GET /api/media requests the resolved folder path', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => [] }));
    vi.stubGlobal('fetch', fetchSpy);

    await new MediaModule().handle(
      jsonRequest('https://site.test/api/media?path=/products', 'GET'),
      makeContext(),
    );
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    // Literal slashes preserved (ImageKit does not decode %2F).
    expect(calledUrl).toContain('path=/root/products');
  });

  it('POST /api/media/folder creates a folder under the resolved parent path', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 201, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/folder', 'POST', { name: 'new', path: '/products' }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/folder');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ folderName: 'new', parentFolderPath: '/root/products' });
  });

  it('DELETE /api/media/folder deletes the resolved folder path', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 204, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/folder?path=/products', 'DELETE'),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/folder');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ folderPath: '/root/products' });
  });

  it('PUT /api/media/folder renames the resolved folder via a bulk job', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 202, json: async () => ({ jobId: 'job_1' }) }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/folder', 'PUT', { path: '/products', newName: 'goods' }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/bulkJobs/renameFolder');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ folderPath: '/root/products', newFolderName: 'goods' });
  });

  it('PUT /api/media renames a file by its absolute path', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media', 'PUT', { filePath: '/root/products/a.png', newFileName: 'b.png' }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.imagekit.io/v1/files/rename');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ filePath: '/root/products/a.png', newFileName: 'b.png' });
  });

  it('DELETE /api/media/:fileId removes the file', async () => {
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 204, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/file_123', 'DELETE'),
      makeContext({ fileId: 'file_123' }),
    );
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.imagekit.io/v1/files/file_123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('maps an ImageKit 404 on delete to NOT_FOUND', async () => {
    mockFetch(() => ({ ok: false, status: 404, json: async () => ({}) }));
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/missing', 'DELETE'),
      makeContext({ fileId: 'missing' }),
    );
    expect(res.status).toBe(404);
    expect((await readJson(res)).code).toBe(ErrorCode.NOT_FOUND);
  });

  it('rejects unsupported methods', async () => {
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media', 'PATCH'),
      makeContext(),
    );
    expect(res.status).toBe(405);
  });
});
