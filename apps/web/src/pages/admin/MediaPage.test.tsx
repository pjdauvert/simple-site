import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { MediaFile } from '@simple-site/interfaces';
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

describe('MediaPage', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the empty state and upload button when there is no media', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText('No media yet. Upload your first image or video.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
  });

  it('renders a tile per media item', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue([
      file({ fileId: '1', name: 'a.png', mime: 'image/png' }),
      file({ fileId: '2', name: 'b.mp4', mime: 'video/mp4' }),
    ]);
    renderPage();

    expect(await screen.findByText('a.png')).toBeInTheDocument();
    expect(screen.getByText('b.mp4')).toBeInTheDocument();
  });

  it('opens the delete confirmation dialog', async () => {
    vi.mocked(mediaService.listMedia).mockResolvedValue([
      file({ fileId: '1', name: 'a.png', mime: 'image/png' }),
    ]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete media?')).toBeInTheDocument();
  });
});
