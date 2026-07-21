import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import type { I18nDictionary } from '@simple-site/interfaces';
import { IntlProvider } from './IntlProvider';
import { IntlContext } from './IntlContext';
import type { LanguagesInfo } from '../../services/initService';

const child = (
  <>
    <div><FormattedMessage id="t.empty" defaultMessage="EMPTY_DEFAULT" /></div>
    <div><FormattedMessage id="t.filled" defaultMessage="FILLED_DEFAULT" /></div>
  </>
);

// Exposes the reconciled active locale and the config default from the context.
const LocaleProbe = () => {
  const ctx = useContext(IntlContext);
  return <div data-testid="locale-probe">{ctx ? `${ctx.locale}|${ctx.defaultLocale}` : 'none'}</div>;
};

describe('IntlProvider', () => {
  beforeEach(() => localStorage.clear());

  it('drops empty-string overlays so the key falls back to its defaultMessage', async () => {
    const loadTranslations = async (): Promise<I18nDictionary> => ({ 't.empty': '', 't.filled': 'Filled' });
    render(<IntlProvider loadTranslations={loadTranslations}>{child}</IntlProvider>);
    // Empty overlay → defaultMessage; non-empty overlay → the API value.
    await waitFor(() => expect(screen.getByText('Filled')).toBeInTheDocument());
    expect(screen.getByText('EMPTY_DEFAULT')).toBeInTheDocument();
  });

  it('resolves a regional saved locale to its language-subtag match', async () => {
    localStorage.setItem('app.locale', 'fr-CA'); // valid, but only plain fr is offered
    const loadLanguages = async (): Promise<LanguagesInfo> => ({ defaultLocale: 'en', locales: ['en', 'fr'] });
    render(
      <IntlProvider loadLanguages={loadLanguages}>
        <LocaleProbe />
      </IntlProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('locale-probe')).toHaveTextContent('fr|en'));
  });

  it('falls back to the config default language when the saved locale is not offered', async () => {
    localStorage.setItem('app.locale', 'de'); // valid code, but not in the available set
    // defaultLocale deliberately not 'en' to prove the fallback is config-driven.
    const loadLanguages = async (): Promise<LanguagesInfo> => ({ defaultLocale: 'fr', locales: ['fr', 'en'] });
    render(
      <IntlProvider loadLanguages={loadLanguages}>
        <FormattedMessage id="t.x" defaultMessage="X" />
        <LocaleProbe />
      </IntlProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('locale-probe')).toHaveTextContent('fr|fr'));
    // No crash rendering under the reconciled locale.
    expect(screen.getByText('X')).toBeInTheDocument();
  });
});
