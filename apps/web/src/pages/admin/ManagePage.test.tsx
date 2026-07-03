import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig, SiteThemeConfig } from '@simple-site/interfaces';
import { AuthContext } from '../../features/auth/AuthContext';
import type { AuthContextValue } from '../../features/auth/AuthContext';
import messages from '../../features/i18n/i18n.json';
import { ManagePage } from './ManagePage';
import { loadDraftConfig, listVersions } from '../../services/configVersionService';
import { updateSiteSettings } from '../../services/siteConfigService';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

vi.mock('../../layouts/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../services/configVersionService', () => ({
  loadDraftConfig: vi.fn(),
  listVersions: vi.fn(),
  publishDraft: vi.fn(),
  importConfig: vi.fn(),
  getVersionConfig: vi.fn(),
  renameVersion: vi.fn(),
  republishVersion: vi.fn(),
  startDraftFromVersion: vi.fn(),
  deleteVersion: vi.fn(),
}));
vi.mock('../../services/siteConfigService', () => ({ updateSiteSettings: vi.fn() }));
vi.mock('../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));

const siteConfig = (site: Partial<SiteThemeConfig> = {}): SiteConfig =>
  ({
    site: {
      siteName: 'My Site',
      logoUrl: '/logo.svg',
      faviconUrl: '/favicon.ico',
      containerMaxWidth: 'lg',
      ...site,
    },
    themes: [],
    pages: [],
  }) as unknown as SiteConfig;

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
          <ManagePage />
        </AuthContext.Provider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('ManagePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(siteConfig());
    vi.mocked(listVersions).mockResolvedValue({
      published: { key: 'published', name: 'Published' },
      draft: null,
      archives: [],
    });
    vi.mocked(updateSiteSettings).mockResolvedValue(undefined);
    vi.mocked(useFeatureFlags).mockReturnValue({ media: true });
  });

  it('shows Hello {name} when user has a name', async () => {
    renderWithAuth({ user: { id: 'u1', name: 'Alice', email: 'a@b.com' } });
    expect(screen.getByText('Hello Alice')).toBeInTheDocument();
    await screen.findByLabelText(/site name/i); // flush the form's initial load
  });

  it('falls back to email when name is absent', async () => {
    renderWithAuth({ user: { id: 'u1', email: 'a@b.com' } });
    expect(screen.getByText('Hello a@b.com')).toBeInTheDocument();
    await screen.findByLabelText(/site name/i);
  });

  it('renders the dashboard disclaimer', async () => {
    renderWithAuth();
    expect(
      screen.getByText('Here you can manage the entire configuration of your site'),
    ).toBeInTheDocument();
    await screen.findByLabelText(/site name/i);
  });

  it('prefills the form from the loaded config', async () => {
    renderWithAuth();
    expect(await screen.findByDisplayValue('My Site')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/logo.svg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/favicon.ico')).toBeInTheDocument();
  });

  it('keeps Save disabled until a field changes', async () => {
    renderWithAuth();
    await screen.findByDisplayValue('My Site');
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/site name/i), { target: { value: 'My Site 2' } });
    expect(saveButton).toBeEnabled();
  });

  it('saves the edited site settings via updateSiteSettings', async () => {
    renderWithAuth();
    const nameInput = await screen.findByLabelText(/site name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    expect(updateSiteSettings).toHaveBeenCalledWith({
      siteName: 'New Name',
      logoUrl: '/logo.svg',
      faviconUrl: '/favicon.ico',
      containerMaxWidth: 'lg',
    });
    await waitFor(() => expect(screen.getByText('Site settings saved')).toBeInTheDocument());
  });

  it('blocks submit and flags the field when the site name is empty', async () => {
    renderWithAuth();
    const nameInput = await screen.findByLabelText(/site name/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    expect(updateSiteSettings).not.toHaveBeenCalled();
    expect(screen.getByText('Site name is required')).toBeInTheDocument();
  });

  it('hides the library picker button when the media feature is disabled', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false });
    renderWithAuth();
    await screen.findByLabelText(/site name/i);
    expect(screen.queryByRole('button', { name: /choose from library/i })).not.toBeInTheDocument();
  });
});
