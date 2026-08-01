import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import messages from '../../features/i18n/i18n.json';
import { ContactPage } from './ContactPage';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { sendContactMessage } from '../../services/contactService';

vi.mock('../../services/contactService', () => ({ sendContactMessage: vi.fn() }));
vi.mock('../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
  ALL_DISABLED: { media: false, team: false, contact: false },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/contact']}>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <ContactPage />
      </IntlProvider>
    </MemoryRouter>,
  );
}

const fillForm = (email: string, message: string) => {
  fireEvent.change(screen.getByLabelText(/Your email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Message/), { target: { value: message } });
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

describe('ContactPage (public /contact)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: true });
  });

  it('renders the 404 page when the contact feature is disabled', async () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false });
    renderPage();
    expect(await screen.findByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the form with a character counter when the feature is enabled', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Contact us' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Your email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
    expect(screen.getByText('0/1000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  it('caps the message input at 1000 characters and counts what is typed', () => {
    renderPage();
    const input = screen.getByLabelText(/Message/) as HTMLTextAreaElement;
    expect(input).toHaveAttribute('maxlength', '1000');
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(screen.getByText('5/1000')).toBeInTheDocument();
  });

  it('rejects an invalid email without calling the API', async () => {
    renderPage();
    fillForm('not-an-email', 'Hello there');
    submit();
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('rejects an empty message without calling the API', async () => {
    renderPage();
    fillForm('jane@site.test', '   ');
    submit();
    expect(await screen.findByText('Please write a message')).toBeInTheDocument();
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('sends the trimmed message and confirms, clearing the form', async () => {
    vi.mocked(sendContactMessage).mockResolvedValue(undefined);
    renderPage();
    fillForm('jane@site.test', '  Hello there  ');
    submit();
    expect(await screen.findByText('Your message has been sent. Thank you!')).toBeInTheDocument();
    expect(sendContactMessage).toHaveBeenCalledWith({ email: 'jane@site.test', message: 'Hello there' });
    expect((screen.getByLabelText(/Your email/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/Message/) as HTMLTextAreaElement).value).toBe('');
  });

  it('shows a generic error when the API call fails, keeping the input', async () => {
    vi.mocked(sendContactMessage).mockRejectedValue(new Error('boom'));
    renderPage();
    fillForm('jane@site.test', 'Hello there');
    submit();
    expect(await screen.findByText('Something went wrong. Please try again later.')).toBeInTheDocument();
    expect(screen.queryByText('Your message has been sent. Thank you!')).not.toBeInTheDocument();
    expect((screen.getByLabelText(/Message/) as HTMLTextAreaElement).value).toBe('Hello there');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled());
  });
});
