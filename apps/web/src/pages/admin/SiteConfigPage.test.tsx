import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig, SiteThemeConfig } from '@simple-site/interfaces';
import { NotificationsProvider } from '../../features/notifications/NotificationsProvider';
import messages from '../../features/i18n/i18n.json';
import { SiteConfigPage } from './SiteConfigPage';
import { GeneralTab } from './GeneralTab';
import { ThemesTab } from './ThemesTab';
import { PagesTab } from './PagesTab';
import { MenuTab } from './MenuTab';
import { loadDraftConfig } from '../../services/configVersionService';
import { updateSiteSettings } from '../../services/siteConfigService';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

vi.mock('../../services/configVersionService', () => ({ loadDraftConfig: vi.fn(), saveDraftConfig: vi.fn() }));
vi.mock('../../services/siteConfigService', () => ({ updateSiteSettings: vi.fn() }));
vi.mock('../../services/themesService', () => ({ updateThemes: vi.fn() }));
vi.mock('../../services/menuService', () => ({ updateMenu: vi.fn() }));
vi.mock('../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn(), ALL_DISABLED: { media: false } }));

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

// Mirrors the nested route tree wired in ManageRouter, so tab links resolve the
// same way (relative to `/manage/site`).
function renderSiteConfig(initialPath = '/manage/site/general') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <NotificationsProvider>
          <Routes>
            <Route path="/manage/site" element={<SiteConfigPage />}>
              <Route index element={<Navigate to="general" replace />} />
              <Route path="general" element={<GeneralTab />} />
              <Route path="themes" element={<ThemesTab />} />
              <Route path="pages" element={<PagesTab />} />
              <Route path="menu" element={<MenuTab />} />
            </Route>
          </Routes>
        </NotificationsProvider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('SiteConfigPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(siteConfig());
    vi.mocked(updateSiteSettings).mockResolvedValue(undefined);
    vi.mocked(useFeatureFlags).mockReturnValue({ media: true });
  });

  it('renders the General / Themes / Pages / Menu tabs', async () => {
    renderSiteConfig();
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Themes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pages' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Menu' })).toBeInTheDocument();
    await screen.findByLabelText(/site name/i);
  });

  it('redirects the bare /manage/site path to the General tab', async () => {
    renderSiteConfig('/manage/site');
    expect(await screen.findByLabelText(/site name/i)).toBeInTheDocument();
  });

  it('shows the Themes editor when the Themes tab is selected', async () => {
    renderSiteConfig();
    await screen.findByLabelText(/site name/i);
    fireEvent.click(screen.getByRole('tab', { name: 'Themes' }));
    expect(await screen.findByRole('button', { name: /add theme/i })).toBeInTheDocument();
  });

  it('shows the Pages editor when navigated to directly', async () => {
    renderSiteConfig('/manage/site/pages');
    expect(await screen.findByRole('button', { name: /add page/i })).toBeInTheDocument();
  });

  it('shows the Menu editor when navigated to directly', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue({
      ...siteConfig(),
      pages: [{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }],
    } as SiteConfig);
    renderSiteConfig('/manage/site/menu');
    expect(await screen.findByRole('button', { name: /save menu/i })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('prefills the General form from the loaded draft', async () => {
    renderSiteConfig();
    expect(await screen.findByDisplayValue('My Site')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/logo.svg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/favicon.ico')).toBeInTheDocument();
  });

  it('keeps Save disabled until a field changes', async () => {
    renderSiteConfig();
    await screen.findByDisplayValue('My Site');
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/site name/i), { target: { value: 'My Site 2' } });
    expect(saveButton).toBeEnabled();
  });

  it('saves the edited site settings via updateSiteSettings', async () => {
    renderSiteConfig();
    const nameInput = await screen.findByLabelText(/site name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    expect(updateSiteSettings).toHaveBeenCalledWith({
      siteName: 'New Name',
      defaultLanguage: 'en',
      logoUrl: '/logo.svg',
      faviconUrl: '/favicon.ico',
      containerMaxWidth: 'lg',
    });
    await waitFor(() => expect(screen.getByText('Site settings saved')).toBeInTheDocument());
  });

  it('blocks submit and flags the field when the site name is empty', async () => {
    renderSiteConfig();
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
    renderSiteConfig();
    await screen.findByLabelText(/site name/i);
    expect(screen.queryByRole('button', { name: /view library/i })).not.toBeInTheDocument();
  });
});
