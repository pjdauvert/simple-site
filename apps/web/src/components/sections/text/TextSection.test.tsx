import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import type { TextSectionProps, ThemeConfig } from '@simple-site/interfaces';
import { TextSection } from './TextSection';
import { renderWithProviders } from '../../../test/renderWithProviders';

/**
 * Characterization tests for the PUBLIC rendering of a text section. These lock
 * the contract the inline-editing seam must preserve: paragraphs render as
 * Markdown, config values are i18n *defaults*, and empty columns render nothing.
 */

const themeConfig = {
  themeName: 'default',
  primaryColor: '#1976d2',
  secondaryColor: '#9c27b0',
  linkColor: '#1976d2',
  linkHoverColor: '#1565c0',
  backgroundColor: '#ffffff',
  menuBackgroundColor: '#f5f5f5',
  menuHoverColor: '#e0e0e0',
} as unknown as ThemeConfig;

const SECTION = 'page.home.intro';

const renderText = (props: Partial<TextSectionProps>, messages: Record<string, string> = {}) =>
  renderWithProviders(
    <TextSection
      type="text"
      sectionName={SECTION}
      content={props.content ?? { columns: [{}] }}
      design={props.design}
    />,
    { messages, theme: { themeConfig } },
  );

describe('TextSection (public rendering)', () => {
  it('renders a column title and its markdown paragraph', () => {
    renderText({ content: { columns: [{ title: 'About', paragraph: 'Hello **world**' }] } });
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByText('world').tagName).toBe('STRONG');
  });

  it('renders markdown lists and links', () => {
    renderText({
      content: { columns: [{ paragraph: '- one\n- two\n\n[docs](https://example.com)' }] },
    });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'docs' })).toHaveAttribute('href', 'https://example.com');
  });

  it('renders several columns', () => {
    renderText({ content: { columns: [{ title: 'One' }, { title: 'Two' }] } });
    expect(screen.getByRole('heading', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Two' })).toBeInTheDocument();
  });

  it('prefers a translation over the config default for the scoped key', () => {
    renderText(
      { content: { columns: [{ title: 'About' }] } },
      { [`${SECTION}.content.columns.0.title`]: 'À propos' },
    );
    expect(screen.getByRole('heading', { name: 'À propos' })).toBeInTheDocument();
    expect(screen.queryByText('About')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty column', () => {
    renderText({ content: { columns: [{}] } });
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
