import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent, waitFor } from '@testing-library/dom';
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

describe('MediaPage', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the empty state and action buttons when a folder is empty', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue(result());
    renderPage();

    expect(
      await screen.findByText('No media yet. Upload your first image or video.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument();
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
    expect(await screen.findByText('dropped.png')).toBeInTheDocument();
  });
});
