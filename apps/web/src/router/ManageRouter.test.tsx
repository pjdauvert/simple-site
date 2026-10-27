import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Outlet, Route, Routes } from 'react-router-dom';
import { ManageRouter } from './ManageRouter';
import { mockFeatures, mockFeaturesLoading } from '../test/featureFlags';
import { TEST_USER, renderWithProviders } from '../test/renderWithProviders';

vi.mock('../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
// The admin chrome's language switch needs the app's own intl context, which
// the test provider stack deliberately does not mount; the switch is not what
// this suite is about.
vi.mock('../features/i18n/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

// Every admin page is a leaf with its own suite; this one is about which ones
// the router lets exist at all, so they are stubbed down to a marker.
vi.mock('../pages/admin/ManagePage', () => ({ ManagePage: () => <p>dashboard pane</p> }));
vi.mock('../pages/admin/SiteConfigPage', () => ({
  SiteConfigPage: () => (
    <>
      <p>site pane</p>
      <Outlet />
    </>
  ),
}));
vi.mock('../pages/admin/GeneralTab', () => ({ GeneralTab: () => null }));
vi.mock('../pages/admin/ThemesTab', () => ({ ThemesTab: () => null }));
vi.mock('../pages/admin/PagesTab', () => ({ PagesTab: () => null }));
vi.mock('../pages/admin/MenuTab', () => ({ MenuTab: () => null }));
vi.mock('../pages/admin/TranslationsPage', () => ({ TranslationsPage: () => <p>translations pane</p> }));
vi.mock('../pages/admin/MediaPage', () => ({ MediaPage: () => <p>media pane</p> }));
vi.mock('../pages/admin/TeamPage', () => ({
  TeamPage: () => (
    <>
      <p>team pane</p>
      <Outlet />
    </>
  ),
}));
vi.mock('../pages/admin/TeamPageTab', () => ({ TeamPageTab: () => null }));
vi.mock('../pages/admin/TeamMembersTab', () => ({ TeamMembersTab: () => null }));
vi.mock('../pages/admin/TeamDesignTab', () => ({ TeamDesignTab: () => null }));
vi.mock('../pages/admin/ContactPage', () => ({ ContactPage: () => <p>contact pane</p> }));
vi.mock('../pages/admin/GalleryPage', () => ({
  GalleryPage: () => (
    <>
      <p>gallery pane</p>
      <Outlet />
    </>
  ),
}));
vi.mock('../pages/admin/GalleryItemsTab', () => ({ GalleryItemsTab: () => null }));
vi.mock('../pages/admin/GalleryTagsTab', () => ({ GalleryTagsTab: () => null }));
vi.mock('../pages/admin/GalleryDesignTab', () => ({ GalleryDesignTab: () => null }));
vi.mock('../pages/admin/EventsPage', () => ({
  EventsPage: () => (
    <>
      <p>events pane</p>
      <Outlet />
    </>
  ),
}));
vi.mock('../pages/admin/EventsListTab', () => ({ EventsListTab: () => <p>events list tab</p> }));
vi.mock('../pages/admin/EventsAgendaDesignTab', () => ({ EventsAgendaDesignTab: () => <p>agenda design tab</p> }));
vi.mock('../pages/admin/EventsEventDesignTab', () => ({ EventsEventDesignTab: () => <p>event design tab</p> }));

// `App.tsx` mounts the router under `/manage/*`; its own <Routes> are relative
// to that, so the test has to reproduce the splat or nothing ever matches.
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/manage/*" element={<ManageRouter />} />
    </Routes>,
    {
      route,
      theme: true,
      notifications: true,
      auth: { user: TEST_USER as never, isLoading: false },
    },
  );

describe('ManageRouter — flag gating of the admin area', () => {
  beforeEach(() => vi.resetAllMocks());

  it('waits for the flags before deciding what the admin area contains', () => {
    mockFeaturesLoading();
    renderAt('/manage');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('dashboard pane')).not.toBeInTheDocument();
  });

  describe('with FEATURE_EVENTS off', () => {
    beforeEach(() => mockFeatures('team', 'gallery'));

    it('offers no Events entry in the admin navigation', () => {
      renderAt('/manage');
      expect(screen.getByText('dashboard pane')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /events/i })).not.toBeInTheDocument();
      // The features that ARE on still have theirs.
      expect(screen.getByRole('link', { name: /gallery/i })).toBeInTheDocument();
    });

    it.each(['/manage/events', '/manage/events/list', '/manage/events/agenda-design', '/manage/events/event-design'])(
      'does not register %s',
      (route) => {
        renderAt(route);
        expect(screen.queryByText(/events pane|events list tab|agenda design tab|event design tab/)).toBeNull();
      },
    );
  });

  describe('with FEATURE_EVENTS on', () => {
    beforeEach(() => mockFeatures('events'));

    it('shows the Events entry and serves every tab', () => {
      renderAt('/manage');
      expect(screen.getByRole('link', { name: /events/i })).toHaveAttribute('href', '/manage/events');
    });

    it.each([
      ['/manage/events/list', 'events list tab'],
      ['/manage/events/agenda-design', 'agenda design tab'],
      ['/manage/events/event-design', 'event design tab'],
    ])('serves %s', (route, marker) => {
      renderAt(route);
      expect(screen.getByText(marker)).toBeInTheDocument();
    });

    it('redirects the bare /manage/events to the list tab', () => {
      renderAt('/manage/events');
      expect(screen.getByText('events list tab')).toBeInTheDocument();
    });
  });
});
