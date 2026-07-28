import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { TeamConfig, TeamMember } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { TeamPageSettings } from './TeamPageSettings';
import { loadTeam, saveTeam } from '../../../services/teamService';

vi.mock('../../../services/teamService', () => ({ loadTeam: vi.fn(), saveTeam: vi.fn() }));

const member = (slug: string, name: string): TeamMember =>
  ({ slug, name, jobTitle: 'Engineer', biography: { en: 'Bio' } });

function renderSettings() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <TeamPageSettings />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('TeamPageSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadTeam).mockResolvedValue({ members: [] });
    vi.mocked(saveTeam).mockResolvedValue(undefined);
  });

  it('saves the title and presentation, each linking to its translation key', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderSettings();

    fireEvent.change(await screen.findByLabelText(/team page title/i), { target: { value: 'The crew' } });
    fireEvent.change(screen.getByLabelText(/team presentation/i), { target: { value: 'Our wonderful crew' } });

    const translateButtons = screen.getAllByRole('button', { name: /translate/i });
    fireEvent.click(translateButtons[0]);
    expect(open).toHaveBeenCalledWith('/manage/translations?key=team.title', '_blank');
    fireEvent.click(translateButtons[1]);
    expect(open).toHaveBeenCalledWith('/manage/translations?key=team.presentation', '_blank');
    open.mockRestore();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });
    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.title).toBe('The crew');
    expect(saved.presentation).toBe('Our wonderful crew');
  });

  it('saves the layout switches and the former-members section title', async () => {
    renderSettings();
    await screen.findByLabelText(/team page title/i);

    fireEvent.click(screen.getByRole('checkbox', { name: /alternate member sides/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /show former members/i }));
    // The section-title field appears once the switch is on, with its own shortcut.
    fireEvent.change(await screen.findByLabelText(/former members section title/i), { target: { value: 'Alumni' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });
    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.alternateLayout).toBe(true);
    expect(saved.showFormerMembers).toBe(true);
    expect(saved.formerMembersTitle).toBe('Alumni');
  });

  it('re-fetches on save so members edited from the Members tab are preserved', async () => {
    // Initial load: empty team. By save time the Members tab stored two members.
    vi.mocked(loadTeam)
      .mockResolvedValueOnce({ members: [] })
      .mockResolvedValueOnce({ members: [member('jane-doe', 'Jane'), member('john-smith', 'John')] });
    renderSettings();

    fireEvent.change(await screen.findByLabelText(/team page title/i), { target: { value: 'The crew' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });

    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.members.map((m) => m.slug)).toEqual(['jane-doe', 'john-smith']);
    expect(saved.title).toBe('The crew');
  });
});
