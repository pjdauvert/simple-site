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
  ALL_DISABLED: { media: false, team: false, contact: false },
}));

const themeValue: ThemeContextValue = {
  themeName: 'default',
  themeConfig: { themeName: 'default' } as unknown as ThemeConfig,
  siteThemeConfig: { siteName: 'Test Site', containerMaxWidth: 'lg' } as ThemeContextValue['siteThemeConfig'],
  switchTheme: () => {},
  availableThemes: [],
};

const member = (slug: string, name: string, over: Partial<TeamMember> = {}): TeamMember =>
  ({ slug, name, jobTitle: { en: 'Engineer' }, biography: { en: `About ${name}` }, ...over });

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
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: true, contact: false });
  });

  it('renders the 404 page when the team feature is disabled', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false });
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
      title: 'Our team',
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

  it('truncates a long biography at a word boundary — the ellipsis links to the member page', async () => {
    const longBio = `${'word '.repeat(80)}final`;
    vi.mocked(loadTeam).mockResolvedValue({
      members: [
        member('jane-doe', 'Jane Doe', { biography: { en: longBio } }),
        member('john-smith', 'John Smith'),
      ],
    });
    renderPage();
    await screen.findByText('Jane Doe');

    const more = screen.getByRole('link', { name: '…' });
    expect(more).toHaveAttribute('href', '/team/member/jane-doe');
    expect(more).toHaveAttribute('title', 'Read the full biography');
    // The cut never splits a word, so the tail never reaches the page.
    expect(screen.queryByText(/final/)).not.toBeInTheDocument();
    // The short biography stays untouched: one single ellipsis link on the page.
    expect(screen.getByText('About John Smith')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '…' })).toHaveLength(1);
  });

  it('renders the optional presentation text above the member list', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [member('jane-doe', 'Jane Doe'), member('john-smith', 'John Smith')],
      presentation: 'Our wonderful crew',
    });
    renderPage();
    expect(await screen.findByText('Our wonderful crew')).toBeInTheDocument();
  });

  it('renders a customized title, and no heading at all when the title is not set', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [member('jane-doe', 'Jane Doe'), member('john-smith', 'John Smith')],
      title: 'The crew',
    });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'The crew' })).toBeInTheDocument();
  });

  it('renders no presentation block nor heading when neither is set', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [member('jane-doe', 'Jane Doe'), member('john-smith', 'John Smith')],
    });
    renderPage();
    await screen.findByText('Jane Doe');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText('Our wonderful crew')).not.toBeInTheDocument();
  });

  it('shows former members in a separated, dimmed section only when the switch is on', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [
        member('jane-doe', 'Jane Doe'),
        member('john-smith', 'John Smith'),
        { ...member('ada-martin', 'Ada Martin'), former: true, photoUrl: '/img/ada.jpg' },
      ],
      showFormerMembers: true,
      formerMembersTitle: 'Former members',
    });
    const { container } = renderPage();
    expect(await screen.findByRole('heading', { level: 2, name: 'Former members' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ada Martin' })).toHaveAttribute('href', '/team/member/ada-martin');
    // Horizontal separator above the section, grayscale portrait on its rows.
    expect(container.querySelector('hr')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ada Martin' })).toHaveStyle('filter: grayscale(1)');
  });

  it('renders the former section without a heading when its title is not set', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [member('jane-doe', 'Jane Doe'), { ...member('ada-martin', 'Ada Martin'), former: true }],
      showFormerMembers: true,
    });
    const { container } = renderPage();
    expect(await screen.findByText('Ada Martin')).toBeInTheDocument();
    expect(container.querySelector('hr')).toBeInTheDocument();
    // No section heading — the member names are the only h2 headings left.
    expect(screen.queryByRole('heading', { level: 2, name: 'Former members' })).not.toBeInTheDocument();
  });

  it('hides former members entirely when the switch is off', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [
        member('jane-doe', 'Jane Doe'),
        member('john-smith', 'John Smith'),
        { ...member('ada-martin', 'Ada Martin'), former: true },
      ],
    });
    renderPage();
    await screen.findByText('Jane Doe');
    expect(screen.queryByText('Former members')).not.toBeInTheDocument();
    expect(screen.queryByText('Ada Martin')).not.toBeInTheDocument();
  });

  it('keeps the single-profile shortcut only when no former section is visible', async () => {
    // One current + one hidden former → the single current member's profile.
    vi.mocked(loadTeam).mockResolvedValue({
      members: [member('jane-doe', 'Jane Doe'), { ...member('ada-martin', 'Ada Martin'), former: true }],
    });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.queryByText('Ada Martin')).not.toBeInTheDocument();

    // Same team with the switch on → the list view with the former section.
    vi.mocked(loadTeam).mockResolvedValue({
      members: [member('jane-doe', 'Jane Doe'), { ...member('ada-martin', 'Ada Martin'), former: true }],
      showFormerMembers: true,
      formerMembersTitle: 'Former members',
    });
    renderPage();
    expect(await screen.findByRole('heading', { level: 2, name: 'Former members' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ada Martin' })).toBeInTheDocument();
  });
});

describe('isReversedRow (alternate layout)', () => {
  it('flips odd rows only when the option is on', () => {
    expect([0, 1, 2, 3].map((i) => isReversedRow(i, true))).toEqual([false, true, false, true]);
    expect([0, 1, 2, 3].map((i) => isReversedRow(i, false))).toEqual([false, false, false, false]);
  });
});
