import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { SiteConfig } from '@simple-site/interfaces';
import { ThemesTab } from './ThemesTab';
import { loadDraftConfig } from '../../services/configVersionService';
import { updateThemes } from '../../services/themesService';
import { DRAFT_AUTO_SAVE_DELAY } from '../../hooks/useDraftAutoSave';
import { renderWithProviders } from '../../test/renderWithProviders';

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

const renderTab = () => renderWithProviders(<ThemesTab />, { notifications: true });

/** Advances past the auto-save debounce and lets the write settle. */
const settleAutoSave = async () => {
  await act(async () => {
    vi.advanceTimersByTime(DRAFT_AUTO_SAVE_DELAY + 50);
  });
};

describe('ThemesTab', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // The clock keeps running on its own (so `findBy*` still settles) while
    // tests jump the auto-save debounce explicitly.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(loadDraftConfig).mockResolvedValue(config([lightTheme]));
    vi.mocked(updateThemes).mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it('prefills the themes from the loaded draft', async () => {
    renderTab();
    expect(await screen.findByText('Light')).toBeInTheDocument();
  });

  it('writes nothing for the draft it just loaded', async () => {
    renderTab();
    await screen.findByText('Light');
    await settleAutoSave();
    expect(updateThemes).not.toHaveBeenCalled();
  });

  it('auto-saves an edited color, round-tripping the rest of the loaded theme', async () => {
    renderTab();
    await screen.findByText('Light');
    fireEvent.change(screen.getByRole('textbox', { name: /^primary/i }), { target: { value: '#abcdef' } });

    await settleAutoSave();
    expect(updateThemes).toHaveBeenCalledTimes(1);
    expect(updateThemes).toHaveBeenCalledWith([{ ...lightTheme, primaryColor: '#abcdef' }]);
  });

  it('holds the write while a newly added theme has no name, then saves it once named', async () => {
    renderTab();
    await screen.findByText('Light');
    fireEvent.click(screen.getByRole('button', { name: /add theme/i }));
    expect(screen.getByText('Untitled theme')).toBeInTheDocument();

    // Only the expanded theme's fields are reachable — the new one's.
    await settleAutoSave();
    expect(updateThemes).not.toHaveBeenCalled();
    // The name is required: flagged on the spot, since it is what holds the write.
    const name = screen.getByRole('textbox', { name: /theme name/i });
    expect(name).toBeInvalid();

    fireEvent.change(name, { target: { value: 'Dark' } });
    await settleAutoSave();
    expect(updateThemes).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateThemes).mock.calls[0][0].map((t) => t.themeName)).toEqual(['Light', 'Dark']);
  });

  it('holds the write while two themes share a name, and says why', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(config([lightTheme, { ...lightTheme, themeName: 'Dark' }]));
    renderTab();
    fireEvent.click(await screen.findByText('Dark')); // expand the second theme
    await settleAutoSave();

    const name = screen.getByRole('textbox', { name: /theme name/i });
    fireEvent.change(name, { target: { value: 'Light' } });
    expect(screen.getByText('Theme names must be unique')).toBeInTheDocument();
    await settleAutoSave();
    expect(updateThemes).not.toHaveBeenCalled();

    fireEvent.change(name, { target: { value: 'Dusk' } });
    await settleAutoSave();
    expect(updateThemes).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateThemes).mock.calls[0][0].map((t) => t.themeName)).toEqual(['Light', 'Dusk']);
  });

  it('auto-saves the remaining set when a theme is deleted', async () => {
    renderTab();
    await screen.findByText('Light');
    fireEvent.click(screen.getByRole('button', { name: /delete theme/i }));
    await waitFor(() => expect(screen.queryByText('Light')).not.toBeInTheDocument());

    await settleAutoSave();
    expect(updateThemes).toHaveBeenCalledWith([]);
  });

  it('reports a failed write as a toast that stays', async () => {
    vi.mocked(updateThemes).mockRejectedValue(new Error('Failed to save themes'));
    renderTab();
    await screen.findByText('Light');
    fireEvent.change(screen.getByRole('textbox', { name: /^primary/i }), { target: { value: '#abcdef' } });

    await settleAutoSave();
    expect(await screen.findByText('Could not save: Failed to save themes')).toBeInTheDocument();
  });
});
