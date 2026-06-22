import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { MediaModule } from './MediaModule';
import { ErrorCode } from '@simple-site/interfaces';

const ENV: Record<string, string> = {
  IMAGEKIT_PRIVATE_KEY: 'private_test_key',
  IMAGEKIT_PUBLIC_KEY: 'public_test_key',
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

  it('POST /api/media/upload-auth returns a signed token + canonical payload', async () => {
    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/upload-auth', 'POST', { fileName: 'pic.jpg', tags: ['a', 'b'] }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.ok).toBe(true);
    expect(body.data.publicKey).toBe('public_test_key');
    expect(typeof body.data.token).toBe('string');
    expect(body.data.uploadPayload).toMatchObject({
      fileName: 'pic.jpg',
      folder: '/media',
      useUniqueFileName: 'true',
      tags: 'a,b',
    });
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

  it('GET /api/media lists mapped files and filters videos by mime', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      json: async () => [
        { fileId: '1', name: 'a.png', filePath: '/media/a.png', url: 'https://ik/a.png', fileType: 'image', mime: 'image/png' },
        { fileId: '2', name: 'b.mp4', filePath: '/media/b.mp4', url: 'https://ik/b.mp4', fileType: 'non-image', mime: 'video/mp4' },
      ],
    }));

    const all = await new MediaModule().handle(jsonRequest('https://site.test/api/media', 'GET'), makeContext());
    expect((await readJson(all)).data).toHaveLength(2);

    const videos = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media?type=video', 'GET'),
      makeContext(),
    );
    const data = (await readJson(videos)).data;
    expect(data).toHaveLength(1);
    expect(data[0].fileId).toBe('2');
  });

  it('DELETE /api/media/:fileId removes the file', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await new MediaModule().handle(
      jsonRequest('https://site.test/api/media/file_123', 'DELETE'),
      makeContext({ fileId: 'file_123' }),
    );
    expect(res.status).toBe(200);
    expect((await readJson(res)).ok).toBe(true);
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
      jsonRequest('https://site.test/api/media', 'PUT'),
      makeContext(),
    );
    expect(res.status).toBe(405);
  });
});
