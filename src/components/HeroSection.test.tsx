import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import { Hero } from './HeroSection';

const messages = {
  'test.title': 'Test Title',
  'test.subtitle': 'Test Subtitle',
  'test.cta': 'Click Me',
};

describe('Hero Component', () => {
  it('renders hero with translated text', () => {
    render(
      <IntlProvider locale="en" messages={messages}>
        <Hero
          titleId="test.title"
          subtitleId="test.subtitle"
          ctaId="test.cta"
        />
      </IntlProvider>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders CTA button when onCtaClick is provided', () => {
    const handleClick = vi.fn();

    render(
      <IntlProvider locale="en" messages={messages}>
        <Hero
          titleId="test.title"
          subtitleId="test.subtitle"
          ctaId="test.cta"
          onCtaClick={handleClick}
        />
      </IntlProvider>
    );

    const button = screen.getByRole('button', { name: /Click Me/i });
    expect(button).toBeInTheDocument();
  });

  it('does not render CTA button when onCtaClick is not provided', () => {
    render(
      <IntlProvider locale="en" messages={messages}>
        <Hero
          titleId="test.title"
          subtitleId="test.subtitle"
          ctaId="test.cta"
        />
      </IntlProvider>
    );

    const button = screen.queryByRole('button');
    expect(button).not.toBeInTheDocument();
  });
});

