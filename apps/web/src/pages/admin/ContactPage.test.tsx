import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import messages from '../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../features/notifications/NotificationsProvider';
import { ContactPage } from './ContactPage';
import { loadContactConfig, saveContactConfig } from '../../services/contactService';
import { loadAllTranslations } from '../../services/translationsService';

vi.mock('../../services/contactService', () => ({ loadContactConfig: vi.fn(), saveContactConfig: vi.fn() }));
vi.mock('../../services/translationsService', () => ({ loadAllTranslations: vi.fn() }));

function renderPage() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <ContactPage />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('ContactPage (admin /manage/contact)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadContactConfig).mockResolvedValue({});
    vi.mocked(loadAllTranslations).mockResolvedValue({ defaultLanguage: 'en', translations: {} });
    vi.mocked(saveContactConfig).mockResolvedValue(undefined);
  });

  it('reminds which default language the text is entered in', async () => {
    renderPage();
    expect(await screen.findByText(/default language — English \(en\)/i)).toBeInTheDocument();
  });

  it('hides the reminder when the translations payload cannot be loaded', async () => {
    vi.mocked(loadAllTranslations).mockRejectedValue(new Error('offline'));
    renderPage();
    await screen.findByLabelText(/presentation message/i); // page still fully usable
    expect(screen.queryByText(/default language/i)).not.toBeInTheDocument();
  });

  it('loads the stored presentation into the field', async () => {
    vi.mocked(loadContactConfig).mockResolvedValue({ presentation: 'Write to us!' });
    renderPage();
    expect(await screen.findByLabelText(/presentation message/i)).toHaveValue('Write to us!');
  });

  it('saves the trimmed presentation, linking to its translation key', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPage();
    fireEvent.change(await screen.findByLabelText(/presentation message/i), { target: { value: '  We reply fast.  ' } });

    fireEvent.click(screen.getByRole('button', { name: /translate/i }));
    expect(open).toHaveBeenCalledWith('/manage/translations?key=contact.presentation', '_blank');
    open.mockRestore();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(saveContactConfig).toHaveBeenCalledWith({ presentation: 'We reply fast.' }));
  });

  it('saves an empty field as no presentation', async () => {
    vi.mocked(loadContactConfig).mockResolvedValue({ presentation: 'Old' });
    renderPage();
    fireEvent.change(await screen.findByLabelText(/presentation message/i), { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(saveContactConfig).toHaveBeenCalledWith({}));
  });

  it('shows the load error instead of the form', async () => {
    vi.mocked(loadContactConfig).mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.queryByLabelText(/presentation message/i)).not.toBeInTheDocument();
  });
});
