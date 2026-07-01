import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import messages from '../../features/i18n/i18n.json';
import { TranslationsPage } from './TranslationsPage';
import { loadTranslations } from '../../services/initService';
import { replaceTranslations } from '../../services/translationsService';

vi.mock('../../services/initService', () => ({ loadTranslations: vi.fn() }));
vi.mock('../../services/translationsService', () => ({ replaceTranslations: vi.fn() }));

const enDict = { 'page.home.title': 'Home' };
const frDict = { 'page.home.title': 'Accueil' };

const renderPage = () =>
  render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <TranslationsPage />
    </IntlProvider>,
  );

describe('TranslationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadTranslations).mockImplementation(async (locale) => (locale === 'en' ? enDict : frDict));
    vi.mocked(replaceTranslations).mockResolvedValue(undefined);
  });

  it('prefills a row per key from both locales', async () => {
    renderPage();
    expect(await screen.findByText('page.home.title')).toBeInTheDocument();
    expect(screen.getByLabelText('page.home.title EN')).toHaveValue('Home');
    expect(screen.getByLabelText('page.home.title FR')).toHaveValue('Accueil');
  });

  it('saves edited values by replacing every locale dictionary', async () => {
    renderPage();
    const enField = await screen.findByLabelText('page.home.title EN');
    fireEvent.change(enField, { target: { value: 'Welcome' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save translations/i }));
    });
    expect(replaceTranslations).toHaveBeenCalledWith('en', { 'page.home.title': 'Welcome' });
    expect(replaceTranslations).toHaveBeenCalledWith('fr', { 'page.home.title': 'Accueil' });
    await waitFor(() => expect(screen.getByText('Translations saved')).toBeInTheDocument());
  });

  it('adds a new key', async () => {
    renderPage();
    await screen.findByText('page.home.title');
    fireEvent.change(screen.getByLabelText('New key'), { target: { value: 'page.home.subtitle' } });
    fireEvent.click(screen.getByRole('button', { name: /add key/i }));
    expect(screen.getByText('page.home.subtitle')).toBeInTheDocument();
  });

  it('rejects an invalid new key', async () => {
    renderPage();
    await screen.findByText('page.home.title');
    fireEvent.change(screen.getByLabelText('New key'), { target: { value: 'bad key' } });
    fireEvent.click(screen.getByRole('button', { name: /add key/i }));
    expect(screen.getByText('Key may only contain letters, numbers, . and _')).toBeInTheDocument();
    expect(screen.queryByText('bad key')).not.toBeInTheDocument();
  });

  it('removes a key', async () => {
    renderPage();
    await screen.findByText('page.home.title');
    fireEvent.click(screen.getByRole('button', { name: /remove page\.home\.title/i }));
    expect(screen.queryByText('page.home.title')).not.toBeInTheDocument();
  });
});
