import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Markdown } from './Markdown';

const wrap = (markdown: string) =>
  render(
    <MemoryRouter>
      <Markdown>{markdown}</Markdown>
    </MemoryRouter>,
  );

describe('Markdown', () => {
  it('renders GFM tables with MUI table semantics', () => {
    wrap(['| Name | Role |', '| :--- | :---: |', '| Jane | PI |'].join('\n'));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Jane' })).toBeInTheDocument();
    // GFM column alignment carries through to the MUI cell.
    expect(screen.getByRole('columnheader', { name: 'Role' })).toHaveStyle({ textAlign: 'center' });
  });

  it('renders GFM strikethrough', () => {
    wrap('~~gone~~');
    expect(screen.getByText('gone').tagName).toBe('DEL');
  });

  it('routes internal links through the SPA and opens external ones in a new tab', () => {
    wrap('[profile](/team/member/jane) and [site](https://example.com)');
    const internal = screen.getByRole('link', { name: 'profile' });
    expect(internal).toHaveAttribute('href', '/team/member/jane');
    expect(internal).not.toHaveAttribute('target');
    const external = screen.getByRole('link', { name: 'site' });
    expect(external).toHaveAttribute('href', 'https://example.com');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
