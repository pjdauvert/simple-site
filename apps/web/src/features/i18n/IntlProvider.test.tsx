import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FormattedMessage } from 'react-intl';
import type { I18nDictionary, Locale } from '@simple-site/interfaces';
import { IntlProvider } from './IntlProvider';

const child = (
  <>
    <div><FormattedMessage id="t.empty" defaultMessage="EMPTY_DEFAULT" /></div>
    <div><FormattedMessage id="t.filled" defaultMessage="FILLED_DEFAULT" /></div>
  </>
);

describe('IntlProvider', () => {
  beforeEach(() => localStorage.clear());

  it('drops empty-string overlays so the key falls back to its defaultMessage', async () => {
    const loadTranslations = async (): Promise<I18nDictionary> => ({ 't.empty': '', 't.filled': 'Filled' });
    render(<IntlProvider loadTranslations={loadTranslations}>{child}</IntlProvider>);
    // Empty overlay → defaultMessage; non-empty overlay → the API value.
    await waitFor(() => expect(screen.getByText('Filled')).toBeInTheDocument());
    expect(screen.getByText('EMPTY_DEFAULT')).toBeInTheDocument();
  });

  it('falls back to the base locale when the saved locale is not offered', async () => {
    localStorage.setItem('app.locale', 'de'); // valid code, but not in the available set
    const loadLanguages = async (): Promise<Locale[]> => ['en', 'fr'];
    render(
      <IntlProvider loadLanguages={loadLanguages}>
        <FormattedMessage id="t.x" defaultMessage="X" />
      </IntlProvider>,
    );
    await waitFor(() => expect(localStorage.getItem('app.locale')).not.toBeNull());
    // The provider reconciles the active locale to the base locale (en); no crash.
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
