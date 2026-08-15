import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import type { HeroSectionProps, ThemeConfig } from '@simple-site/interfaces';
import { HeroSection } from './HeroSection';
import { renderWithProviders } from '../../../test/renderWithProviders';

/**
 * Characterization tests for the PUBLIC rendering of a hero section. These lock
 * the contract the inline-editing seam must preserve: config values are i18n
 * *defaults* (a translation for the scoped key wins), and empty optional fields
 * render nothing at all.
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

const SECTION = 'page.home.hero';

const renderHero = (props: Partial<HeroSectionProps>, messages: Record<string, string> = {}) =>
  renderWithProviders(
    <HeroSection type="hero" sectionName={SECTION} content={props.content ?? {}} design={props.design} />,
    { messages, theme: { themeConfig } },
  );

describe('HeroSection (public rendering)', () => {
  it('renders the title and subtitle from the config defaults', () => {
    renderHero({ content: { title: 'Build fast', subtitle: 'A tiny CMS' } });
    expect(screen.getByRole('heading', { name: 'Build fast' })).toBeInTheDocument();
    expect(screen.getByText('A tiny CMS')).toBeInTheDocument();
  });

  it('prefers a translation over the config default for the scoped key', () => {
    renderHero(
      { content: { title: 'Build fast' } },
      { [`${SECTION}.content.title`]: 'Construire vite' },
    );
    expect(screen.getByRole('heading', { name: 'Construire vite' })).toBeInTheDocument();
    expect(screen.queryByText('Build fast')).not.toBeInTheDocument();
  });

  it('renders CTA buttons with their labels and links', () => {
    renderHero({
      content: { title: 'T', ctaButtons: [{ label: 'Get started', link: '/start', variant: 'contained' }] },
    });
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/start');
  });

  it('renders featuring items (label + value) in the split layout', () => {
    renderHero({
      content: { featuringItems: [{ label: 'Users', value: '2k' }] },
      design: { layout: 'split' },
    });
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('2k')).toBeInTheDocument();
  });

  // Current behaviour: `featuringRow` is only composed into the split layout, so a
  // centered hero silently drops featuringItems. Locked here so the inline-editing
  // refactor doesn't change it by accident (see note in the PR — likely a bug).
  it('omits featuring items in the centered layout', () => {
    renderHero({ content: { title: 'T', featuringItems: [{ label: 'Users', value: '2k' }] } });
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('renders the artwork image in the split layout', () => {
    renderHero({
      content: { title: 'T' },
      design: { layout: 'split', artwork: { imageUrl: '/art.png', alt: 'Art' } },
    });
    expect(screen.getByRole('img', { name: 'Art' })).toHaveAttribute('src', '/art.png');
  });

  it('renders nothing for empty optional fields', () => {
    renderHero({ content: {} });
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
