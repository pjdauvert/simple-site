import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { ThemesPage } from './ThemesPage';
import { loadSiteConfig } from '../../services/initService';
import { updateThemes } from '../../services/themesService';

vi.mock('../../services/initService', () => ({ loadSiteConfig: vi.fn() }));
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

const renderPage = () =>
  render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <ThemesPage />
    </IntlProvider>,
  );

describe('ThemesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadSiteConfig).mockResolvedValue(config([lightTheme]));
    vi.mocked(updateThemes).mockResolvedValue(undefined);
  });

  it('prefills the themes from the loaded config', async () => {
    renderPage();
    expect(await screen.findByText('Light')).toBeInTheDocument();
  });

  it('saves the themes via updateThemes (round-trips the loaded theme)', async () => {
    renderPage();
    await screen.findByText('Light');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save themes/i }));
    });
    expect(updateThemes).toHaveBeenCalledWith([lightTheme]);
    await waitFor(() => expect(screen.getByText('Themes saved')).toBeInTheDocument());
  });

  it('blocks save when a newly added theme has no name', async () => {
    renderPage();
    await screen.findByText('Light');
    fireEvent.click(screen.getByRole('button', { name: /add theme/i }));
    expect(screen.getByText('Untitled theme')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save themes/i }));
    });
    expect(updateThemes).not.toHaveBeenCalled();
    expect(
      screen.getByText('Please fill in the theme name and all required colors'),
    ).toBeInTheDocument();
  });

  it('deletes a theme and can then save the remaining set', async () => {
    renderPage();
    await screen.findByText('Light');
    fireEvent.click(screen.getByRole('button', { name: /delete theme/i }));
    await waitFor(() => expect(screen.queryByText('Light')).not.toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save themes/i }));
    });
    expect(updateThemes).toHaveBeenCalledWith([]);
  });
});
