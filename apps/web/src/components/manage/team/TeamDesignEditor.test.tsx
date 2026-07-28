import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { TeamConfig, TeamMember } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { TeamDesignEditor } from './TeamDesignEditor';
import { loadTeam, saveTeam } from '../../../services/teamService';

vi.mock('../../../services/teamService', () => ({ loadTeam: vi.fn(), saveTeam: vi.fn() }));

const member = (slug: string, name: string): TeamMember =>
  ({ slug, name, jobTitle: 'Engineer', biography: { en: 'Bio' } });

function renderEditor() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <TeamDesignEditor />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('TeamDesignEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadTeam).mockResolvedValue({ members: [] });
    vi.mocked(saveTeam).mockResolvedValue(undefined);
  });

  it('shows both surface blocks, with the alternate switch in the team-page block', async () => {
    renderEditor();
    expect(await screen.findByText('Team page design')).toBeInTheDocument();
    expect(screen.getByText('Member page design')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /alternate member sides/i })).toBeInTheDocument();
    // Two radius sliders — one per surface.
    expect(screen.getAllByRole('slider', { name: /picture corner radius/i })).toHaveLength(2);
  });

  it('saves deviations per surface, preserving members via the re-fetch merge', async () => {
    vi.mocked(loadTeam)
      .mockResolvedValueOnce({ members: [] })
      .mockResolvedValueOnce({ members: [member('jane-doe', 'Jane')], title: 'The crew' });
    renderEditor();
    await screen.findByText('Team page design');

    fireEvent.click(screen.getByRole('checkbox', { name: /alternate member sides/i }));

    // Team-page surface: square-ish portrait with a border.
    const [teamSlider] = screen.getAllByRole('slider', { name: /picture corner radius/i });
    fireEvent.change(teamSlider, { target: { value: 20 } });
    const [teamPictureBorder] = screen.getAllByRole('checkbox', { name: /^picture border$/i });
    fireEvent.click(teamPictureBorder);
    fireEvent.change(screen.getByLabelText('Picture border color', { selector: 'input[type="text"]' }), {
      target: { value: '#ff0000' },
    });

    // Member-page surface: drop the default bio-card border.
    const frameBorderSwitches = screen.getAllByRole('checkbox', { name: /^frame border$/i });
    fireEvent.click(frameBorderSwitches[1]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });
    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.members.map((m) => m.slug)).toEqual(['jane-doe']); // preserved
    expect(saved.title).toBe('The crew'); // preserved
    expect(saved.alternateLayout).toBe(true);
    expect(saved.design).toEqual({
      teamPage: { pictureRadius: 20, pictureBorder: true, pictureBorderColor: '#ff0000' },
      memberPage: { frameBorder: false },
    });
  });

  it('saves no design at all while both surfaces are pristine', async () => {
    renderEditor();
    await screen.findByText('Team page design');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save team/i }));
    });
    await waitFor(() => expect(saveTeam).toHaveBeenCalled());
    const saved = vi.mocked(saveTeam).mock.calls[0][0] as TeamConfig;
    expect(saved.design).toBeUndefined();
  });
});
