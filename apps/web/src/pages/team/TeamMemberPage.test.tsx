import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
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
  ALL_DISABLED: { media: false, team: false, contact: false, gallery: false },
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
  jobTitle: { en: 'Founder' },
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
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: true, contact: false, gallery: false });
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

  it('flags a former member with a chip next to the job title, without dimming the page', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [{ ...jane, former: true }] });
    renderAt('/team/member/jane-doe');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    expect(screen.getByText('Former member')).toBeInTheDocument();
    // The personal page keeps the photo in full color.
    expect(screen.getByRole('img', { name: 'Jane Doe' })).not.toHaveStyle('filter: grayscale(1)');
  });

  it('shows no former chip for a current member', async () => {
    renderAt('/team/member/jane-doe');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    expect(screen.queryByText('Former member')).not.toBeInTheDocument();
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

  it('switches job title and biography together through the profile language switch', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [{ ...jane, jobTitle: { en: 'Founder', fr: 'Fondatrice' } }],
    });
    renderAt('/team/member/jane-doe');
    // Platform locale (en) is preselected because the profile has it.
    expect(await screen.findByText('English bio')).toBeInTheDocument();
    expect(screen.getByText('Founder')).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'Profile language' });
    expect(group).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(screen.getByText('Bio française')).toBeInTheDocument();
    expect(screen.getByText('Fondatrice')).toBeInTheDocument();
    expect(screen.queryByText('Founder')).not.toBeInTheDocument();
  });

  it('hides the profile language switch when the texts exist in one language only', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [{ ...jane, biography: { en: 'English bio' } }],
    });
    renderAt('/team/member/jane-doe');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    expect(screen.queryByRole('group', { name: 'Profile language' })).not.toBeInTheDocument();
  });

  it('applies the member-page design: portrait radius/border and bio frame overrides', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [jane],
      design: {
        memberPage: {
          pictureRadius: 10,
          pictureBorder: true,
          pictureBorderColor: '#ff0000',
          frameBackgroundColor: '#fafafa',
          frameBorder: false,
        },
      },
    });
    renderAt('/team/member/jane-doe');
    const img = await screen.findByRole('img', { name: 'Jane Doe' });
    expect(img).toHaveStyle({ borderRadius: '10%' });
    expect(img).toHaveStyle({ border: '4px solid #ff0000' });
  });

  it('defaults to a circular, borderless portrait without design options', async () => {
    renderAt('/team/member/jane-doe');
    const img = await screen.findByRole('img', { name: 'Jane Doe' });
    expect(img).toHaveStyle({ borderRadius: '50%' });
  });

  it('renders the 404 page for an unknown slug', async () => {
    renderAt('/team/member/nobody');
    expect(await screen.findByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the 404 page when the feature is disabled', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: false });
    renderAt('/team/member/jane-doe');
    expect(await screen.findByText('Oops — nothing here!')).toBeInTheDocument();
    expect(loadTeam).not.toHaveBeenCalled();
  });
});
