import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { AuthContext } from '../../features/auth/AuthContext';
import type { AuthContextValue } from '../../features/auth/AuthContext';
import { NotificationsProvider } from '../../features/notifications/NotificationsProvider';
import messages from '../../features/i18n/i18n.json';
import { ManagePage } from './ManagePage';
import { listVersions } from '../../services/configVersionService';

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

function renderWithAuth(contextValue: Partial<AuthContextValue> = {}) {
  const defaults: AuthContextValue = {
    user: { id: 'u1', email: 'a@b.com' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <MemoryRouter>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <AuthContext.Provider value={{ ...defaults, ...contextValue }}>
          <NotificationsProvider>
            <ManagePage />
          </NotificationsProvider>
        </AuthContext.Provider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

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
