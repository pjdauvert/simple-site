import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig } from '@simple-site/interfaces';
import { NotificationsProvider } from '../../features/notifications/NotificationsProvider';
import messages from '../../features/i18n/i18n.json';
import { TranslationsPage } from './TranslationsPage';
import { loadDraftConfig } from '../../services/configVersionService';
import {
  deleteLanguage,
  importTranslations,
  loadAllTranslations,
  replaceTranslations,
} from '../../services/translationsService';

vi.mock('../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../services/translationsService', () => ({
  loadAllTranslations: vi.fn(),
  replaceTranslations: vi.fn(),
  importTranslations: vi.fn(),
  deleteLanguage: vi.fn(),
}));

// Config → expected keys: home.menuTitle="Home", hero1.content.title="Welcome".
const draftConfig = {
  site: { siteName: 'S' },
  themes: [],
  pages: [{
    pageName: 'home',
    route: '/',
    menuTitle: 'Home',
    sections: [{ sectionName: 'hero1', type: 'hero', content: { title: 'Welcome' } }],
  }],
} as unknown as SiteConfig;

const blob = () => ({
  en: { 'home.menuTitle': 'Home', 'hero1.content.title': 'Welcome EN', 'orphan.key': 'Extra' },
  fr: { 'home.menuTitle': 'Accueil' },
});

const renderPage = () =>
  render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <TranslationsPage />
      </NotificationsProvider>
    </IntlProvider>,
  );

const selectLanguage = async (match: RegExp) => {
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: match }));
};

// jsdom's File.text() is unreliable, so hand the component a file-like object whose
// text() resolves deterministically (the component only calls `.text()`).
const fileWith = (content: string) => ({ name: 'i18n.json', text: () => Promise.resolve(content) }) as unknown as File;

describe('TranslationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadAllTranslations).mockResolvedValue(blob());
    vi.mocked(loadDraftConfig).mockResolvedValue(draftConfig);
    vi.mocked(replaceTranslations).mockResolvedValue(undefined);
    vi.mocked(importTranslations).mockResolvedValue(undefined);
    vi.mocked(deleteLanguage).mockResolvedValue(undefined);
  });

  it('merges config + blob keys, shows originals, and flags extra keys', async () => {
    renderPage();
    expect(await screen.findByLabelText('hero1.content.title')).toHaveValue('Welcome EN');
    expect(screen.getByLabelText('home.menuTitle')).toHaveValue('Home');
    expect(screen.getByText('Welcome')).toBeInTheDocument(); // config original column
    expect(screen.getByLabelText('orphan.key')).toHaveValue('Extra');
    expect(screen.getByText('extra')).toBeInTheDocument(); // row tag
    expect(screen.getByText('1 extra')).toBeInTheDocument();
    expect(screen.getByText('0 missing')).toBeInTheDocument();
  });

  it('switches language and flags missing config keys', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    await selectLanguage(/Français/);
    await waitFor(() => expect(screen.getByText('1 missing')).toBeInTheDocument());
    expect(screen.getByLabelText('hero1.content.title')).toHaveValue(''); // missing → empty
    expect(screen.queryByLabelText('orphan.key')).not.toBeInTheDocument(); // not in fr
  });

  it('saves the selected language via replaceTranslations', async () => {
    renderPage();
    const field = await screen.findByLabelText('home.menuTitle');
    fireEvent.change(field, { target: { value: 'Home 2' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    expect(replaceTranslations).toHaveBeenCalledWith('en', {
      'home.menuTitle': 'Home 2',
      'hero1.content.title': 'Welcome EN',
      'orphan.key': 'Extra',
    });
    await waitFor(() => expect(screen.getByText(/translations saved/i)).toBeInTheDocument());
  });

  it('adds a language, generating the config keys empty', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    fireEvent.click(screen.getByRole('button', { name: /add language/i }));
    fireEvent.change(await screen.findByLabelText(/language code/i), { target: { value: 'de' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    });
    expect(replaceTranslations).toHaveBeenCalledWith('de', { 'home.menuTitle': '', 'hero1.content.title': '' });
    await waitFor(() => expect(screen.getByText(/Deutsch added/i)).toBeInTheDocument());
  });

  it('rejects an invalid import file', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    const input = screen.getByTestId('translations-import-input');
    await act(async () => {
      fireEvent.change(input, { target: { files: [fileWith('not json')] } });
    });
    await waitFor(() => expect(screen.getByText(/invalid translations file/i)).toBeInTheDocument());
    expect(importTranslations).not.toHaveBeenCalled();
  });

  it('imports a valid i18n.json file', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    const input = screen.getByTestId('translations-import-input');
    await act(async () => {
      fireEvent.change(input, { target: { files: [fileWith(JSON.stringify({ de: { 'home.menuTitle': 'Startseite' } }))] } });
    });
    await waitFor(() =>
      expect(importTranslations).toHaveBeenCalledWith({ de: { 'home.menuTitle': 'Startseite' } }),
    );
    await waitFor(() => expect(screen.getByText(/imported 1 language/i)).toBeInTheDocument());
  });

  it('blocks removing the base language and removes others', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled(); // en is protected

    await selectLanguage(/Français/);
    const removeBtn = await screen.findByRole('button', { name: 'Remove' });
    await waitFor(() => expect(removeBtn).toBeEnabled());
    fireEvent.click(removeBtn);
    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    });
    expect(deleteLanguage).toHaveBeenCalledWith('fr');
    await waitFor(() => expect(screen.getByText(/removed/i)).toBeInTheDocument());
  });
});
