import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { GalleryConfig, SiteConfig } from '@simple-site/interfaces';
import { GalleryTagPage } from './GalleryTagPage';
import { mockFeatures } from '../../test/featureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
vi.mock('../../hooks/useSiteConfig', () => ({ useSiteConfig: vi.fn() }));

const gallery: GalleryConfig = {
  items: [
    { imageUrl: '/root.jpg', title: 'Root shot', tags: [] },
    { imageUrl: '/tree.jpg', title: 'Tree', tags: ['nature'] },
    { title: 'Hidden — no image', tags: ['nature'] },
  ],
  tags: [
    { tag: 'nature', displayName: 'Nature', description: 'Shot in **Corsica**.' },
    { tag: 'blank', displayName: 'Blank' },
  ],
};

const setConfig = (over?: GalleryConfig) =>
  vi.mocked(useSiteConfig).mockReturnValue({
    config: ({ site: { siteName: 'Test' }, themes: [], pages: [], gallery: over ?? gallery }) as unknown as SiteConfig,
  } as unknown as ReturnType<typeof useSiteConfig>);

const renderAt = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/gallery/tag/:tag" element={<GalleryTagPage />} />
    </Routes>,
    { route: path, theme: true },
  );

describe('GalleryTagPage (public /gallery/tag/:tag)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures('gallery');
    setConfig();
  });

  it('renders the 404 page when the gallery feature is disabled', () => {
    mockFeatures();
    renderAt('/gallery/tag/nature');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the tag heading, its description and only its displayable items', () => {
    renderAt('/gallery/tag/nature');
    expect(screen.getByRole('heading', { level: 1, name: 'Nature' })).toBeInTheDocument();
    // The markdown description renders under the heading.
    expect(screen.getByText('Corsica')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tree' })).toBeInTheDocument();
    // The missing-image item and the untagged items stay out.
    expect(screen.queryByText('Hidden — no image')).not.toBeInTheDocument();
    expect(screen.queryByText('Root shot')).not.toBeInTheDocument();
  });

  it('renders the 404 page for an unknown tag and for a tag with nothing displayable', () => {
    renderAt('/gallery/tag/ghost');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();

    renderAt('/gallery/tag/blank');
    expect(screen.getAllByText('Oops — nothing here!').length).toBeGreaterThan(0);
  });
});
