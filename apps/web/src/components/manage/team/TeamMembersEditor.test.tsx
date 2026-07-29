import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { TeamConfig, TeamMember } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { TeamMembersEditor } from './TeamMembersEditor';
import { loadTeam, saveTeam } from '../../../services/teamService';
import { loadLanguages } from '../../../services/initService';

vi.mock('../../../services/teamService', () => ({ loadTeam: vi.fn(), saveTeam: vi.fn() }));
vi.mock('../../../services/initService', () => ({ loadLanguages: vi.fn() }));
vi.mock('../../../services/mediaService', () => ({ listMedia: vi.fn().mockResolvedValue({ folders: [], files: [] }) }));
vi.mock('../../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(() => ({ media: false, team: true })),
  ALL_DISABLED: { media: false, team: false },
}));

const member = (slug: string, name: string): TeamMember =>
  ({ slug, name, jobTitle: { en: 'Engineer' }, biography: { en: 'Bio' } });

function renderEditor() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <TeamMembersEditor />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('TeamMembersEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadTeam).mockResolvedValue({ members: [] });
    vi.mocked(loadLanguages).mockResolvedValue({ defaultLocale: 'en', locales: ['en', 'fr'] });
    vi.mocked(saveTeam).mockResolvedValue(undefined);
  });

  it('shows the empty state', async () => {
    renderEditor();
    expect(await screen.findByText('No team members yet. Add one to get started.')).toBeInTheDocument();
  });

  it('adds a member with a slug auto-derived from the name, then saves', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add member/i }));

    const name = await screen.findByLabelText(/^name/i);
    fireEvent.change(name, { target: { value: 'Éla Dupont' } });
    expect(screen.getByLabelText(/url slug/i)).toHaveValue('ela-dupont');

    // The language switch is shown because the platform offers two languages.
    expect(screen.getByRole('button', { name: 'EN · default' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });

    await waitFor(() => expect(saveTeam).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.members).toHaveLength(1);
    expect(saved.members[0]).toMatchObject({ slug: 'ela-dupont', name: 'Éla Dupont' });
  });

  it('saves social links, dropping emptied ones', async () => {
    vi.mocked(loadTeam).mockResolvedValue({
      members: [{ ...member('jane-doe', 'Jane'), socialLinks: { website: 'https://old.example.com' } }],
    });
    renderEditor();
    await screen.findByText('Jane');

    fireEvent.click(screen.getByRole('button', { name: /edit member/i }));
    fireEvent.change(await screen.findByLabelText('LinkedIn'), { target: { value: 'https://linkedin.com/in/jane' } });
    fireEvent.change(screen.getByLabelText(/website|site web/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    const save = await screen.findByRole('button', { name: /save team/i });
    await act(async () => { fireEvent.click(save); });

    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.members[0].socialLinks).toEqual({ linkedin: 'https://linkedin.com/in/jane' });
  });

  it('toggles a member to former from the dialog and flags it in the list', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [member('jane-doe', 'Jane')] });
    renderEditor();
    await screen.findByText('Jane');

    fireEvent.click(screen.getByRole('button', { name: /edit member/i }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /former member/i }));
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    expect(await screen.findByText('Former')).toBeInTheDocument();

    const save = await screen.findByRole('button', { name: /save team/i });
    await act(async () => { fireEvent.click(save); });
    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.members[0].former).toBe(true);
  });

  it('keeps a hand-edited slug when the name changes afterwards', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add member/i }));

    fireEvent.change(await screen.findByLabelText(/url slug/i), { target: { value: 'custom-slug' } });
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Jane Doe' } });
    expect(screen.getByLabelText(/url slug/i)).toHaveValue('custom-slug');
  });

  it('blocks save and flags the field on a duplicate slug', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [member('jane-doe', 'Jane'), member('jane-doe2', 'Jane 2')] });
    renderEditor();

    const editButtons = await screen.findAllByRole('button', { name: /edit member/i });
    fireEvent.click(editButtons[1]);
    fireEvent.change(await screen.findByLabelText(/url slug/i), { target: { value: 'jane-doe' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });
    expect(saveTeam).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Some members have invalid fields. Please fix the highlighted errors.'),
    ).toBeInTheDocument();
  });

  it('reorders members — the overview order — and saves it', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [member('jane-doe', 'Jane'), member('john-smith', 'John')] });
    renderEditor();
    await screen.findByText('Jane');

    const upButtons = screen.getAllByRole('button', { name: /move up/i });
    fireEvent.click(upButtons[1]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });

    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.members.map((m) => m.slug)).toEqual(['john-smith', 'jane-doe']);
  });

  it('deletes a member after confirmation', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [member('jane-doe', 'Jane'), member('john-smith', 'John')] });
    renderEditor();
    await screen.findByText('Jane');

    fireEvent.click(screen.getAllByRole('button', { name: /delete member/i })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));

    // findByRole waits for the confirm dialog to release the page (aria-hidden).
    const save = await screen.findByRole('button', { name: /save team/i });
    await act(async () => {
      fireEvent.click(save);
    });
    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.members.map((m) => m.slug)).toEqual(['john-smith']);
  });

  it('re-fetches on save so options saved from the Page tab are preserved', async () => {
    // Initial load: one member, no options. By save time the Page tab stored options.
    vi.mocked(loadTeam)
      .mockResolvedValueOnce({ members: [member('jane-doe', 'Jane')] })
      .mockResolvedValueOnce({
        members: [member('jane-doe', 'Jane')],
        title: 'The crew',
        alternateLayout: true,
        showFormerMembers: true,
        formerMembersTitle: 'Alumni',
      });
    renderEditor();
    await screen.findByText('Jane');

    const upDummy = screen.getAllByRole('button', { name: /edit member/i });
    expect(upDummy).toHaveLength(1);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });

    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.title).toBe('The crew');
    expect(saved.alternateLayout).toBe(true);
    expect(saved.showFormerMembers).toBe(true);
    expect(saved.formerMembersTitle).toBe('Alumni');
    expect(saved.members.map((m) => m.slug)).toEqual(['jane-doe']);
  });
});
