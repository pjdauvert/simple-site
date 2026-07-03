import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig } from '@simple-site/interfaces';
import { NotificationsProvider } from '../../features/notifications/NotificationsProvider';
import messages from '../../features/i18n/i18n.json';
import { ThemesTab } from './ThemesTab';
import { loadDraftConfig } from '../../services/configVersionService';
import { updateThemes } from '../../services/themesService';

vi.mock('../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../services/themesService', () => ({ updateThemes: vi.fn() }));

const lightTheme = {
  themeName: 'Light',
  primaryColor: '#111',
  secondaryColor: '#222',
  linkColor: '#333',
  linkHoverColor: '#444',
  backgroundColor: '#fff',
  menuBackgroundColor: '#eee',
  menuHoverColor: '#ddd',
  textColor: '#000',
};

const config = (themes: unknown[]): SiteConfig =>
  ({ site: { siteName: 'S' }, themes, pages: [] }) as unknown as SiteConfig;

const renderTab = () =>
  render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <ThemesTab />
      </NotificationsProvider>
    </IntlProvider>,
  );

describe('ThemesTab', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(config([lightTheme]));
    vi.mocked(updateThemes).mockResolvedValue(undefined);
  });

  it('prefills the themes from the loaded draft', async () => {
    renderTab();
    expect(await screen.findByText('Light')).toBeInTheDocument();
  });

  it('saves the themes via updateThemes (round-trips the loaded theme)', async () => {
    renderTab();
    await screen.findByText('Light');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save themes/i }));
    });
    expect(updateThemes).toHaveBeenCalledWith([lightTheme]);
    await waitFor(() => expect(screen.getByText('Themes saved')).toBeInTheDocument());
  });

  it('blocks save when a newly added theme has no name', async () => {
    renderTab();
    await screen.findByText('Light');
    fireEvent.click(screen.getByRole('button', { name: /add theme/i }));
    expect(screen.getByText('Untitled theme')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save themes/i }));
    });
    expect(updateThemes).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Please fill in the theme name and all required colors'),
    ).toBeInTheDocument();
  });

  it('blocks save when two themes share a name', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      config([lightTheme, { ...lightTheme, themeName: 'Light' }]),
    );
    renderTab();
    await screen.findAllByText('Light');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save themes/i }));
    });
    expect(updateThemes).not.toHaveBeenCalled();
    expect(await screen.findByText('Theme names must be unique')).toBeInTheDocument();
  });

  it('deletes a theme and can then save the remaining set', async () => {
    renderTab();
    await screen.findByText('Light');
    fireEvent.click(screen.getByRole('button', { name: /delete theme/i }));
    await waitFor(() => expect(screen.queryByText('Light')).not.toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save themes/i }));
    });
    expect(updateThemes).toHaveBeenCalledWith([]);
  });
});
