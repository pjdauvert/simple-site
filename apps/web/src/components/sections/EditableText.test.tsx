import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { EditableText } from './EditableText';
import { SectionEditContext } from './sectionEdit';
import type { SectionEditContextValue } from './sectionEdit';

/**
 * The inline "translate" affordance: absent publicly, revealed only while the
 * field has focus, and deep-linking to the Translations editor in a new tab.
 */

const SECTION = 'page.home.hero';
const PATH = 'ctaButtons.0.label';
const KEY = `${SECTION}.content.${PATH}`;

const messages = {
  'page.manage.pages.inline.translate': 'Translate…',
  'page.manage.pages.inline.field.label': 'Label…',
};

const editValue: SectionEditContextValue = {
  setContentAt: vi.fn(),
  setDesignAt: vi.fn(),
  mutate: vi.fn(),
  pickImageAt: vi.fn(),
  canPickImage: false,
  addItemAt: vi.fn(),
  removeItemAt: vi.fn(),
};

const renderPublic = () =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <EditableText sectionName={SECTION} path={PATH} value="Contact us" />
    </IntlProvider>,
  );

const renderEditing = () =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <SectionEditContext.Provider value={editValue}>
        <EditableText sectionName={SECTION} path={PATH} value="Contact us" />
      </SectionEditContext.Provider>
    </IntlProvider>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EditableText translate affordance', () => {
  it('renders the plain message publicly, with no field and no translate button', () => {
    const { container } = renderPublic();
    expect(container).toHaveTextContent('Contact us');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reveals the translate button only while the field is focused', () => {
    renderEditing();
    expect(screen.queryByRole('button', { name: 'Translate…' })).not.toBeInTheDocument();

    fireEvent.focus(screen.getByRole('textbox'));
    expect(screen.getByRole('button', { name: 'Translate…' })).toBeInTheDocument();

    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.queryByRole('button', { name: 'Translate…' })).not.toBeInTheDocument();
  });

  it('opens the Translations editor in a new tab, deep-linked to the field key', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderEditing();

    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Translate…' }));

    expect(open).toHaveBeenCalledWith(
      `/manage/translations?key=${encodeURIComponent(KEY)}`,
      '_blank',
      'noopener',
    );
  });
});
