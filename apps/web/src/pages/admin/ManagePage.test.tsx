import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { AuthContextValue } from '../../features/auth/AuthContext';
import { ManagePage } from './ManagePage';
import { listVersions } from '../../services/configVersionService';
import { renderWithProviders, TEST_USER } from '../../test/renderWithProviders';

// The dashboard now renders only the greeting + the config version panel; the
// version panel pulls the manifest via `configVersionService` on mount.
vi.mock('../../services/configVersionService', () => ({
  listVersions: vi.fn(),
  loadDraftConfig: vi.fn(),
  publishDraft: vi.fn(),
  importConfig: vi.fn(),
  getVersionConfig: vi.fn(),
  renameVersion: vi.fn(),
  republishVersion: vi.fn(),
  startDraftFromVersion: vi.fn(),
  deleteVersion: vi.fn(),
}));

const renderWithAuth = (contextValue: Partial<AuthContextValue> = {}) =>
  renderWithProviders(<ManagePage />, {
    route: '/',
    auth: { user: TEST_USER, ...contextValue },
    notifications: true,
  });

describe('ManagePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listVersions).mockResolvedValue({
      published: { key: 'published', name: 'Published' },
      draft: null,
      archives: [],
    });
  });

  it('shows Hello {name} when user has a name', async () => {
    renderWithAuth({ user: { id: 'u1', name: 'Alice', email: 'a@b.com' } });
    expect(screen.getByText('Hello Alice')).toBeInTheDocument();
    await screen.findByText('Configuration versions'); // flush the panel's initial load
  });

  it('falls back to email when name is absent', async () => {
    renderWithAuth({ user: { id: 'u1', email: 'a@b.com' } });
    expect(screen.getByText('Hello a@b.com')).toBeInTheDocument();
    await screen.findByText('Configuration versions');
  });

  it('renders the config versions panel', async () => {
    renderWithAuth();
    expect(await screen.findByText('Configuration versions')).toBeInTheDocument();
  });
});
