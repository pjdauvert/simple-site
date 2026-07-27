import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { TeamMember, ThemeConfig } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { ThemeContext, type ThemeContextValue } from '../../features/theme/ThemeContext';
import { TeamMemberPage } from './TeamMemberPage';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { loadTeam } from '../../services/teamService';

vi.mock('../../services/teamService', () => ({ loadTeam: vi.fn() }));
vi.mock('../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
  ALL_DISABLED: { media: false, team: false },
}));

const themeValue: ThemeContextValue = {
  themeName: 'default',
  themeConfig: { themeName: 'default' } as unknown as ThemeConfig,
  siteThemeConfig: { siteName: 'Test Site', containerMaxWidth: 'lg' } as ThemeContextValue['siteThemeConfig'],
  switchTheme: () => {},
  availableThemes: [],
};

const jane: TeamMember = {
  slug: 'jane-doe',
  name: 'Jane Doe',
  jobTitle: 'Founder',
  photoUrl: '/img/jane.jpg',
  biography: { en: 'English bio', fr: 'Bio française' },
  socialLinks: { linkedin: 'https://linkedin.com/in/jane', website: 'https://jane.example.com' },
};

function renderAt(path: string, locale: 'en' | 'fr' = 'en') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <IntlProvider locale={locale} messages={messages[locale] as Record<string, string>}>
        <MuiThemeProvider theme={createTheme()}>
          <ThemeContext.Provider value={themeValue}>
            <Routes>
              <Route path="/team/member/:slug" element={<TeamMemberPage />} />
            </Routes>
          </ThemeContext.Provider>
        </MuiThemeProvider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('TeamMemberPage (public /team/member/:slug)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: true });
    vi.mocked(loadTeam).mockResolvedValue({ members: [jane] });
  });

  it('renders the member matching the slug (photo, name, job title, bio)', async () => {
    renderAt('/team/member/jane-doe');
    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('Founder')).toBeInTheDocument();
    expect(screen.getByText('English bio')).toBeInTheDocument();
    // Square face-focused crop for the circular portrait.
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute(
      'src',
      '/img/jane.jpg?tr=w-480,h-480,fo-face,q-80,f-auto',
    );
  });

  it('renders one social icon per provided link, in display order', async () => {
    renderAt('/team/member/jane-doe');
    await screen.findByRole('heading', { name: 'Jane Doe' });

    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual(['LinkedIn', 'Website']);
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://linkedin.com/in/jane');
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute('target', '_blank');
  });

  it('renders no social row when the member has no links', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [{ ...jane, socialLinks: undefined }] });
    renderAt('/team/member/jane-doe');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders an initial avatar instead of a photo when none is set', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [{ ...jane, photoUrl: undefined }] });
    renderAt('/team/member/jane-doe');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('sets the document title to the member and site names', async () => {
    renderAt('/team/member/jane-doe');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    expect(document.title).toBe('Jane Doe – Test Site');
  });

  it('shows the biography of the active locale, falling back to the base locale', async () => {
    renderAt('/team/member/jane-doe', 'fr');
    expect(await screen.findByText('Bio française')).toBeInTheDocument();

    vi.mocked(loadTeam).mockResolvedValue({
      members: [{ ...jane, biography: { en: 'English bio' } }],
    });
    renderAt('/team/member/jane-doe', 'fr');
    expect(await screen.findByText('English bio')).toBeInTheDocument();
  });

  it('renders the 404 page for an unknown slug', async () => {
    renderAt('/team/member/nobody');
    expect(await screen.findByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the 404 page when the feature is disabled', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false });
    renderAt('/team/member/jane-doe');
    expect(await screen.findByText('Oops — nothing here!')).toBeInTheDocument();
    expect(loadTeam).not.toHaveBeenCalled();
  });
});
