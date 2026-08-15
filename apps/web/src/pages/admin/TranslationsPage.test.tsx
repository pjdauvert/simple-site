import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { SiteConfig } from '@simple-site/interfaces';
import { TranslationsPage } from './TranslationsPage';
import { buildExportPayload, NATIVE_KEY } from './translationsExport';
import { loadDraftConfig } from '../../services/configVersionService';
import { loadTeam } from '../../services/teamService';
import { loadContactConfig } from '../../services/contactService';
import {
  deleteLanguage,
  importTranslations,
  loadAllTranslations,
  replaceTranslations,
} from '../../services/translationsService';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../services/teamService', () => ({ loadTeam: vi.fn() }));
vi.mock('../../services/contactService', () => ({ loadContactConfig: vi.fn() }));
vi.mock('../../services/translationsService', () => ({
  loadAllTranslations: vi.fn(),
  replaceTranslations: vi.fn(),
  importTranslations: vi.fn(),
  deleteLanguage: vi.fn(),
}));

// Config → expected keys: home.menuTitle="Home", home.hero1.content.title="Welcome".
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

// `en` is the default language (edited inline on the pages), so the payload's
// `translations` holds only the override languages. `es` sorts first → initial selection.
const payload = () => ({
  defaultLanguage: 'en',
  translations: {
    es: { 'home.menuTitle': 'Inicio', 'home.hero1.content.title': 'Bienvenido ES', 'orphan.key': 'Extra' },
    fr: { 'home.menuTitle': 'Accueil' },
  },
});

const renderPage = (initialEntries: string[] = ['/']) =>
  renderWithProviders(<TranslationsPage />, { route: initialEntries, notifications: true });

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
    vi.mocked(loadAllTranslations).mockResolvedValue(payload());
    vi.mocked(loadDraftConfig).mockResolvedValue(draftConfig);
    // Team/contact features off by default: their surfaces 404, keys just absent.
    vi.mocked(loadTeam).mockRejectedValue(new Error('Team not found'));
    vi.mocked(loadContactConfig).mockRejectedValue(new Error('Contact not found'));
    vi.mocked(replaceTranslations).mockResolvedValue(undefined);
    vi.mocked(importTranslations).mockResolvedValue(undefined);
    vi.mocked(deleteLanguage).mockResolvedValue(undefined);
  });

  it('merges the team presentation into the expected keys when the team loads', async () => {
    vi.mocked(loadTeam).mockResolvedValue({ members: [], presentation: 'Our wonderful crew' });
    renderPage();
    // Expected but untranslated in es → an editable empty field with the original shown.
    expect(await screen.findByLabelText('team.presentation')).toHaveValue('');
    expect(screen.getByText('Our wonderful crew')).toBeInTheDocument();
    expect(screen.getByText('1 missing')).toBeInTheDocument();
  });

  it('merges the contact presentation into the expected keys when the settings load', async () => {
    vi.mocked(loadContactConfig).mockResolvedValue({ presentation: 'Write to us!' });
    renderPage();
    expect(await screen.findByLabelText('contact.presentation')).toHaveValue('');
    expect(screen.getByText('Write to us!')).toBeInTheDocument();
  });

  it('selects the first override, shows originals, flags extras and the default language', async () => {
    renderPage();
    expect(await screen.findByLabelText('home.hero1.content.title')).toHaveValue('Bienvenido ES');
    expect(screen.getByLabelText('home.menuTitle')).toHaveValue('Inicio');
    expect(screen.getByText('Welcome')).toBeInTheDocument(); // config original column
    expect(screen.getByLabelText('orphan.key')).toHaveValue('Extra');
    expect(screen.getByText('extra')).toBeInTheDocument(); // row tag
    expect(screen.getByText('1 extra')).toBeInTheDocument();
    expect(screen.getByText('0 missing')).toBeInTheDocument();
    expect(screen.getByText('Default language: English (en)')).toBeInTheDocument();
  });

  it('switches language and flags missing config keys', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    await selectLanguage(/Français/);
    await waitFor(() => expect(screen.getByText('1 missing')).toBeInTheDocument());
    expect(screen.getByLabelText('home.hero1.content.title')).toHaveValue(''); // missing → empty
    expect(screen.queryByLabelText('orphan.key')).not.toBeInTheDocument(); // not in fr
  });

  it('saves the selected language via replaceTranslations', async () => {
    renderPage();
    const field = await screen.findByLabelText('home.menuTitle');
    fireEvent.change(field, { target: { value: 'Inicio 2' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    expect(replaceTranslations).toHaveBeenCalledWith('es', {
      'home.menuTitle': 'Inicio 2',
      'home.hero1.content.title': 'Bienvenido ES',
      'orphan.key': 'Extra',
    });
    await waitFor(() => expect(screen.getByText(/translations saved/i)).toBeInTheDocument());
  });

  it('adds a language, canonicalizing the code and seeding config keys empty', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    fireEvent.click(screen.getByRole('button', { name: /add language/i }));
    fireEvent.change(await screen.findByLabelText(/language code/i), { target: { value: 'fr-ca' } });
    // Live validation resolves the display name + canonical code.
    expect(screen.getByText(/Français canadien \(fr-CA\)/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    });
    expect(replaceTranslations).toHaveBeenCalledWith('fr-CA', { 'home.menuTitle': '', 'home.hero1.content.title': '' });
    await waitFor(() => expect(screen.getByText(/added/i)).toBeInTheDocument());
  });

  it('rejects an unresolvable language code', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    fireEvent.click(screen.getByRole('button', { name: /add language/i }));
    fireEvent.change(await screen.findByLabelText(/language code/i), { target: { value: 'xx' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    });
    expect(replaceTranslations).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid language code/i)).toBeInTheDocument();
  });

  it('rejects the default language', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    fireEvent.click(screen.getByRole('button', { name: /add language/i }));
    fireEvent.change(await screen.findByLabelText(/language code/i), { target: { value: 'en' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    });
    expect(replaceTranslations).not.toHaveBeenCalled();
    expect(screen.getByText(/this is the default language/i)).toBeInTheDocument();
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

  it('exports the selected languages + native via a download', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    // jsdom lacks URL.createObjectURL / revokeObjectURL — provide them.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();
    await screen.findByLabelText('home.menuTitle');
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/native/i)).toBeChecked();
    expect(within(dialog).getByLabelText(/Español/)).toBeChecked();
    expect(within(dialog).getByLabelText(/Français/)).toBeChecked();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Export' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByText(/Exported/i)).toBeInTheDocument());
    clickSpy.mockRestore();
  });

  it('removes an override and blocks removing the last one', async () => {
    renderPage();
    await screen.findByLabelText('home.menuTitle');
    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    expect(removeBtn).toBeEnabled(); // two overrides → removable
    fireEvent.click(removeBtn);
    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    });
    expect(deleteLanguage).toHaveBeenCalledWith('es');
    await waitFor(() => expect(screen.getByText(/removed/i)).toBeInTheDocument());
    // Wait out the dialog's close transition, then check: fr is the last override → protected.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('shows guidance when there are no override languages', async () => {
    vi.mocked(loadAllTranslations).mockResolvedValue({ defaultLanguage: 'en', translations: {} });
    renderPage();
    expect(await screen.findByText(/add a language to start translating/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add language/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('prefills the filter from the ?key= query param', async () => {
    renderPage(['/?key=home.menuTitle']);
    expect(await screen.findByLabelText('home.menuTitle')).toHaveValue('Inicio');
    await waitFor(() => expect(screen.getByLabelText('Filter keys')).toHaveValue('home.menuTitle'));
    expect(screen.queryByLabelText('home.hero1.content.title')).not.toBeInTheDocument(); // filtered out
  });

  it('ANDs space-separated filter tokens and clears via the adornment button', async () => {
    renderPage();
    expect(await screen.findByLabelText('home.menuTitle')).toHaveValue('Inicio');

    // "hero title" → only keys containing both tokens.
    fireEvent.change(screen.getByLabelText('Filter keys'), { target: { value: 'hero title' } });
    expect(screen.getByLabelText('home.hero1.content.title')).toBeInTheDocument();
    expect(screen.queryByLabelText('home.menuTitle')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('orphan.key')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(screen.getByLabelText('Filter keys')).toHaveValue('');
    expect(screen.getByLabelText('home.menuTitle')).toBeInTheDocument();
    expect(screen.getByLabelText('orphan.key')).toBeInTheDocument();
  });
});

describe('buildExportPayload', () => {
  const translations = { es: { a: 'Aes' }, fr: { a: 'Af' } };
  const originals = { a: 'Orig' };

  it('maps native to the config originals and languages to their dicts', () => {
    expect(buildExportPayload([NATIVE_KEY, 'fr'], translations, originals)).toEqual({
      native: { a: 'Orig' },
      fr: { a: 'Af' },
    });
  });

  it('yields an empty dict for a language with no entries', () => {
    expect(buildExportPayload(['de'], translations, originals)).toEqual({ de: {} });
  });
});
