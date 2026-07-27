import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { TeamMember, ThemeConfig } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { ThemeContext, type ThemeContextValue } from '../../features/theme/ThemeContext';
import { TeamPage } from './TeamPage';
import { isReversedRow } from './memberRowLayout';
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

const member = (slug: string, name: string, over: Partial<TeamMember> = {}): TeamMember =>
  ({ slug, name, jobTitle: 'Engineer', biography: { en: `About ${name}` }, ...over });

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/team']}>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <MuiThemeProvider theme={createTheme()}>
          <ThemeContext.Provider value={themeValue}>
            <TeamPage />
          </ThemeContext.Provider>
        </MuiThemeProvider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('TeamPage (public /team)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: true });
  });

  it('renders the 404 page when the team feature is disabled', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false });
    renderPage();
    expect(await screen.findByText('Oops — nothing here!')).toBeInTheDocument();
    expect(loadTeam).not.toHaveBeenCalled();
  });

  it('renders the 404 page when no member is defined', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [] });
    renderPage();
    expect(await screen.findByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the single member profile directly when there is exactly one member', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [member('jane-doe', 'Jane Doe')] });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('About Jane Doe')).toBeInTheDocument();
    // No overview heading — the profile IS the /team page.
    expect(screen.queryByText('Our team')).not.toBeInTheDocument();
  });

  it('renders the overview as flat member rows — identity, full bio, linked names', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [member('jane-doe', 'Jane Doe'), member('john-smith', 'John Smith')],
    });
    renderPage();
    expect(await screen.findByText('Our team')).toBeInTheDocument();

    // Names link to the member pages; biographies are shown in full on the row.
    const jane = screen.getByRole('link', { name: 'Jane Doe' });
    expect(jane).toHaveAttribute('href', '/team/member/jane-doe');
    expect(screen.getByRole('link', { name: 'John Smith' })).toHaveAttribute('href', '/team/member/john-smith');
    expect(screen.getByText('About Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('About John Smith')).toBeInTheDocument();
  });
});

describe('isReversedRow (alternate layout)', () => {
  it('flips odd rows only when the option is on', () => {
    expect([0, 1, 2, 3].map((i) => isReversedRow(i, true))).toEqual([false, true, false, true]);
    expect([0, 1, 2, 3].map((i) => isReversedRow(i, false))).toEqual([false, false, false, false]);
  });
});
