import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { SiteConfig, SiteThemeConfig } from '@simple-site/interfaces';
import { SiteConfigPage } from './SiteConfigPage';
import { GeneralTab } from './GeneralTab';
import { ThemesTab } from './ThemesTab';
import { PagesTab } from './PagesTab';
import { MenuTab } from './MenuTab';
import { loadDraftConfig } from '../../services/configVersionService';
import { updateSiteSettings } from '../../services/siteConfigService';
import { DRAFT_AUTO_SAVE_DELAY } from '../../hooks/useDraftAutoSave';
import { mockFeatures } from '../../test/featureFlags';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('../../services/configVersionService', () => ({ loadDraftConfig: vi.fn(), saveDraftConfig: vi.fn() }));
vi.mock('../../services/siteConfigService', () => ({ updateSiteSettings: vi.fn() }));
vi.mock('../../services/themesService', () => ({ updateThemes: vi.fn() }));
vi.mock('../../services/menuService', () => ({ updateMenu: vi.fn() }));
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

// Mirrors the nested route tree wired in ManageRouter, so tab links resolve the
// same way (relative to `/manage/site`).
const renderSiteConfig = (initialPath = '/manage/site/general') =>
  renderWithProviders(
    <Routes>
      <Route path="/manage/site" element={<SiteConfigPage />}>
        <Route index element={<Navigate to="general" replace />} />
        <Route path="general" element={<GeneralTab />} />
        <Route path="themes" element={<ThemesTab />} />
        <Route path="pages" element={<PagesTab />} />
        <Route path="menu" element={<MenuTab />} />
      </Route>
    </Routes>,
    { route: initialPath, notifications: true },
  );

/** Advances past the auto-save debounce and lets the write settle. */
const settleAutoSave = async () => {
  await act(async () => {
    vi.advanceTimersByTime(DRAFT_AUTO_SAVE_DELAY + 50);
  });
};

describe('SiteConfigPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // The clock keeps running on its own (so `findBy*` still settles) while
    // tests jump the auto-save debounce explicitly.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(loadDraftConfig).mockResolvedValue(siteConfig());
    vi.mocked(updateSiteSettings).mockResolvedValue(undefined);
    mockFeatures('media');
  });
  afterEach(() => vi.useRealTimers());

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
    // Draft-backed tabs own no save button any more — anchor on the Menu
    // editor's own controls.
    expect(await screen.findByRole('button', { name: /add group/i })).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('prefills the General form from the loaded draft', async () => {
    renderSiteConfig();
    expect(await screen.findByDisplayValue('My Site')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/logo.svg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/favicon.ico')).toBeInTheDocument();
  });

  it('offers no save button and writes nothing for the draft it just loaded', async () => {
    renderSiteConfig();
    await screen.findByDisplayValue('My Site');
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    await settleAutoSave();
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it('auto-saves an edited field via updateSiteSettings, reporting it on the indicator', async () => {
    renderSiteConfig();
    const nameInput = await screen.findByLabelText(/site name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    await settleAutoSave();
    expect(updateSiteSettings).toHaveBeenCalledTimes(1);
    expect(updateSiteSettings).toHaveBeenCalledWith({
      siteName: 'New Name',
      defaultLanguage: 'en',
      logoUrl: '/logo.svg',
      faviconUrl: '/favicon.ico',
      containerMaxWidth: 'lg',
    });
    expect(screen.getByText('Saved to draft')).toBeInTheDocument(); // reported as a toast
  });

  it('debounces a burst of keystrokes into a single write', async () => {
    renderSiteConfig();
    const nameInput = await screen.findByLabelText(/site name/i);
    for (const value of ['A', 'AB', 'ABC']) {
      fireEvent.change(nameInput, { target: { value } });
    }
    expect(updateSiteSettings).not.toHaveBeenCalled();

    await settleAutoSave();
    expect(updateSiteSettings).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateSiteSettings).mock.calls[0][0].siteName).toBe('ABC');
  });

  it('holds the write and flags the field when the site name is empty', async () => {
    renderSiteConfig();
    const nameInput = await screen.findByLabelText(/site name/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });
    expect(screen.getByText('Site name is required')).toBeInTheDocument();

    await settleAutoSave();
    expect(updateSiteSettings).not.toHaveBeenCalled();

    // Typing a name releases the held edit.
    fireEvent.change(nameInput, { target: { value: 'Named again' } });
    await settleAutoSave();
    expect(vi.mocked(updateSiteSettings).mock.calls[0][0].siteName).toBe('Named again');
  });

  it('holds the write and flags the field when a URL is malformed', async () => {
    renderSiteConfig();
    await screen.findByDisplayValue('My Site');
    fireEvent.change(screen.getByLabelText(/logo url/i), { target: { value: 'not a url' } });
    expect(screen.getByText(/Enter a valid URL or path/)).toBeInTheDocument();

    await settleAutoSave();
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it('hides the library picker button when the media feature is disabled', async () => {
    mockFeatures();
    renderSiteConfig();
    await screen.findByLabelText(/site name/i);
    expect(screen.queryByRole('button', { name: /view library/i })).not.toBeInTheDocument();
  });
});
