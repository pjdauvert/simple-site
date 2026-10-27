import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ManageTabsShell, type ManageTab } from './ManageTabsShell';
import { renderWithProviders } from '../../test/renderWithProviders';

const TABS: readonly ManageTab[] = [
  { key: 'items', labelKey: 'page.manage.gallery.tab.items' },
  { key: 'tags', labelKey: 'page.manage.gallery.tab.tags' },
  { key: 'design', labelKey: 'page.manage.gallery.tab.design' },
];

const renderAt = (route: string, fallback?: string) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/manage/gallery"
        element={
          <ManageTabsShell
            titleKey="page.manage.gallery.title"
            noteKey="page.manage.gallery.publishNote"
            tabs={TABS}
            fallback={fallback}
          />
        }
      >
        <Route index element={<p>items pane</p>} />
        <Route path="tags" element={<p>tags pane</p>} />
      </Route>
    </Routes>,
    { route, theme: true },
  );

describe('ManageTabsShell', () => {
  it('renders the heading, the page-wide note and one link per tab', () => {
    renderAt('/manage/gallery/tags');

    expect(screen.getByRole('heading', { name: 'Gallery' })).toBeInTheDocument();
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
    for (const [label, href] of [
      ['Items', '/manage/gallery/items'],
      ['Tags', '/manage/gallery/tags'],
      ['Design', '/manage/gallery/design'],
    ]) {
      expect(screen.getByRole('tab', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('marks the tab the URL points at as the selected one', () => {
    renderAt('/manage/gallery/tags');
    expect(screen.getByRole('tab', { name: 'Tags' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'false');
  });

  it('falls back to the first tab on the bare page route, or to the named one', () => {
    const first = renderAt('/manage/gallery');
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'true');
    first.unmount();

    renderAt('/manage/gallery', 'design');
    expect(screen.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders the active tab through the outlet', () => {
    renderAt('/manage/gallery/tags');
    expect(screen.getByText('tags pane')).toBeInTheDocument();
    expect(screen.queryByText('items pane')).not.toBeInTheDocument();
  });

  // A tab label must never be squeezed below a full-size touch target: the bar
  // scrolls instead, which is the whole reason the three pages share a shell.
  it('scrolls the bar rather than crowding it', () => {
    renderAt('/manage/gallery/tags');
    expect(document.querySelector('.MuiTabs-scroller.MuiTabs-scrollableX')).not.toBeNull();
  });
});
