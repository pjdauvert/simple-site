import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent, waitFor, within } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { MediaFile, MediaListResult } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { MediaPage } from './MediaPage';
import * as mediaService from '../../services/mediaService';

vi.mock('../../services/mediaService');

const renderPage = () =>
  render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <MediaPage />
    </IntlProvider>,
  );

const file = (over: Partial<MediaFile> & Pick<MediaFile, 'fileId' | 'name'>): MediaFile => ({
  filePath: `/media/${over.name}`,
  url: `https://ik/${over.name}`,
  ...over,
});

const result = (over: Partial<MediaListResult> = {}): MediaListResult => ({
  folders: [],
  files: [],
  ...over,
});

/** True when `a` appears before `b` in document order. */
const precedes = (a: HTMLElement, b: HTMLElement) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('MediaPage', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the empty state and action buttons when a folder is empty', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(result());
    renderPage();

    expect(
      await screen.findByText('No media yet. Upload your first image or video.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Drag & drop files here, or click to browse' }),
    ).toBeInTheDocument();
  });

  it('renders folder tiles and file tiles', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(
      result({
        folders: [{ folderId: 'fd1', name: 'products', path: '/products' }],
        files: [file({ fileId: '1', name: 'a.png', mime: 'image/png' })],
      }),
    );
    renderPage();

    expect(await screen.findByText('products')).toBeInTheDocument();
    expect(screen.getByText('a.png')).toBeInTheDocument();
  });

  it('lists files by creation date ascending by default (newest last)', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(
      result({
        files: [
          file({ fileId: '2', name: 'newer.png', mime: 'image/png', createdAt: '2026-02-01T00:00:00Z' }),
          file({ fileId: '1', name: 'older.png', mime: 'image/png', createdAt: '2026-01-01T00:00:00Z' }),
        ],
      }),
    );
    renderPage();

    const older = await screen.findByText('older.png');
    expect(precedes(older, screen.getByText('newer.png'))).toBe(true);
  });

  it('lists folders alphabetically regardless of server order', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(
      result({
        folders: [
          { folderId: '1', name: 'Zebra', path: '/Zebra' },
          { folderId: '2', name: 'apple', path: '/apple' },
        ],
      }),
    );
    renderPage();

    const apple = await screen.findByText('apple');
    expect(precedes(apple, screen.getByText('Zebra'))).toBe(true);
  });

  it('appends an uploaded file at the end of the list', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(
      result({
        files: [file({ fileId: '1', name: 'existing.png', mime: 'image/png', createdAt: '2026-01-01T00:00:00Z' })],
      }),
    );
    // The V2 upload response carries no createdAt, so the fresh file sorts last.
    vi.mocked(mediaService.uploadMedia).mockResolvedValue(
      file({ fileId: 'u1', name: 'fresh.png', mime: 'image/png' }),
    );
    renderPage();

    const zone = await screen.findByRole('button', { name: 'Drag & drop files here, or click to browse' });
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'fresh.png', { type: 'image/png' })] } });
    await waitFor(() => expect(mediaService.uploadMedia).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));

    expect(precedes(screen.getByText('existing.png'), screen.getByText('fresh.png'))).toBe(true);
  });

  it('navigates into a folder when its tile is clicked', async () => {
    vi.mocked(mediaService.listMedia)
      .mockResolvedValueOnce(result({ folders: [{ folderId: 'fd1', name: 'products', path: '/products' }] }))
      .mockResolvedValueOnce(result({ files: [file({ fileId: '1', name: 'inside.png', mime: 'image/png' })] }));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Open folder products' }));

    expect(await screen.findByText('inside.png')).toBeInTheDocument();
    expect(mediaService.listMedia).toHaveBeenLastCalledWith('/products', 'all');
  });

  it('opens the delete confirmation dialog for a file', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(
      result({ files: [file({ fileId: '1', name: 'a.png', mime: 'image/png' })] }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete media?')).toBeInTheDocument();
  });

  it('opens the new-folder dialog', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(result());
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'New folder' }));
    expect(await screen.findByLabelText('Folder name')).toBeInTheDocument();
  });

  it('removes a deleted file in place without re-listing the folder', async () => {
    const existing = file({ fileId: '1', name: 'a.png', mime: 'image/png' });
    vi.mocked(mediaService.listMedia).mockResolvedValue(result({ files: [existing] }));
    vi.mocked(mediaService.deleteMedia).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    // Once ImageKit acknowledges, the card animates out and is dropped locally —
    // the folder is not re-fetched.
    await waitFor(() => expect(mediaService.deleteMedia).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(screen.queryByText('a.png')).not.toBeInTheDocument());
    expect(mediaService.listMedia).toHaveBeenCalledTimes(1);
  });

  it('uploads files dropped onto the drop zone', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(result());
    vi.mocked(mediaService.uploadMedia).mockResolvedValue(
      file({ fileId: 'u1', name: 'dropped.png', mime: 'image/png' }),
    );
    renderPage();

    const zone = await screen.findByRole('button', {
      name: 'Drag & drop files here, or click to browse',
    });
    const dropped = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(zone, { dataTransfer: { files: [dropped] } });

    await waitFor(() => expect(mediaService.uploadMedia).toHaveBeenCalledTimes(1));
    // Success leaves a row (name shown twice: row + grid card); dismiss the section.
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(screen.getByText('dropped.png')).toBeInTheDocument();
  });

  it('DIAG full flow with proper waits', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(result()); // folder starts empty
    vi.mocked(mediaService.uploadMedia).mockResolvedValue(
      file({ fileId: 'u1', name: 'dropped.png', mime: 'image/png' }),
    );
    vi.mocked(mediaService.deleteMedia).mockResolvedValue(undefined);
    renderPage();

    const zone = await screen.findByRole('button', { name: 'Drag & drop files here, or click to browse' });
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'dropped.png', { type: 'image/png' })] } });
    await waitFor(() => expect(mediaService.uploadMedia).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(await screen.findByText('dropped.png')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mediaService.deleteMedia).toHaveBeenCalledWith('u1'));
    await waitFor(() => expect(screen.queryByText('dropped.png')).not.toBeInTheDocument());
  });

  it('cancels an in-flight upload and shows a retry button', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(result());
    vi.mocked(mediaService.isUploadCanceled).mockImplementation(
      (err) => (err as Error)?.name === 'AbortError',
    );
    // Stays pending until its AbortSignal fires, mimicking an in-flight upload.
    vi.mocked(mediaService.uploadMedia).mockImplementation(
      (_file, _path, _tags, _onProgress, signal) =>
        new Promise<MediaFile>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('canceled', 'AbortError')));
        }),
    );
    renderPage();

    const zone = await screen.findByRole('button', { name: 'Drag & drop files here, or click to browse' });
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'pending.png', { type: 'image/png' })] } });

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel upload' }));

    // The row persists with a Retry button; no error surfaced; the section is dismissable.
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByText('pending.png')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('retries a canceled upload', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(result());
    vi.mocked(mediaService.isUploadCanceled).mockImplementation(
      (err) => (err as Error)?.name === 'AbortError',
    );
    // First attempt aborts on signal; the retry succeeds.
    vi.mocked(mediaService.uploadMedia)
      .mockImplementationOnce(
        (_file, _path, _tags, _onProgress, signal) =>
          new Promise<MediaFile>((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(new DOMException('canceled', 'AbortError')));
          }),
      )
      .mockResolvedValueOnce(file({ fileId: 'r1', name: 'retry.png', mime: 'image/png' }));
    renderPage();

    const zone = await screen.findByRole('button', { name: 'Drag & drop files here, or click to browse' });
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'retry.png', { type: 'image/png' })] } });

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel upload' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(mediaService.uploadMedia).toHaveBeenCalledTimes(2));
    // On success the retry button is gone and the section can be dismissed.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });
});
