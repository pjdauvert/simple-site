import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { Routes, Route, useLocation } from 'react-router-dom';
import type { MediaFolder } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { ImagePickerDialog } from './ImagePickerDialog';
import { listMedia } from '../../services/mediaService';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('../../services/mediaService', () => ({ listMedia: vi.fn() }));

const en = messages.en as Record<string, string>;
const noop = () => {};

/** Renders the picker under a router and reports where "Upload media" navigates. */
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
};

const renderDialog = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/manage/site/general"
        element={<ImagePickerDialog open onClose={noop} onSelect={noop} />}
      />
      <Route path="/manage/media" element={<LocationProbe />} />
    </Routes>,
    { route: '/manage/site/general', notifications: true },
  );

describe('ImagePickerDialog upload action', () => {
  beforeEach(() => {
    vi.mocked(listMedia).mockReset();
  });

  it('redirects to the media page root when no folder is chosen', async () => {
    vi.mocked(listMedia).mockResolvedValue({ folders: [], files: [] });
    renderDialog();
    await waitFor(() => expect(listMedia).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: en['page.manage.site.picker.upload'] }));

    expect(screen.getByTestId('location')).toHaveTextContent('/manage/media');
    expect(screen.getByTestId('location')).not.toHaveTextContent('path=');
  });

  it('redirects respecting the folder the user browsed to', async () => {
    const brand: MediaFolder = { folderId: 'f1', name: 'brand', path: 'logos/brand' };
    vi.mocked(listMedia).mockImplementation(async (path) =>
      path === '' ? { folders: [brand], files: [] } : { folders: [], files: [] },
    );
    renderDialog();

    // Navigate into the folder, then upload from there.
    fireEvent.click(await screen.findByText('brand'));
    await waitFor(() => expect(listMedia).toHaveBeenCalledWith('logos/brand', 'image'));

    fireEvent.click(screen.getByRole('button', { name: en['page.manage.site.picker.upload'] }));

    expect(screen.getByTestId('location')).toHaveTextContent('/manage/media?path=logos%2Fbrand');
  });
});
