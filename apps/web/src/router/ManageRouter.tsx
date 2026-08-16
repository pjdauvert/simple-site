import { Routes, Route, Navigate } from "react-router-dom";
import type { MenuItem } from "@simple-site/interfaces";
import { ManagePage } from "../pages/admin/ManagePage";
import { SiteConfigPage } from "../pages/admin/SiteConfigPage";
import { GeneralTab } from "../pages/admin/GeneralTab";
import { ThemesTab } from "../pages/admin/ThemesTab";
import { PagesTab } from "../pages/admin/PagesTab";
import { MenuTab } from "../pages/admin/MenuTab";
import { TranslationsPage } from "../pages/admin/TranslationsPage";
import { MediaPage } from "../pages/admin/MediaPage";
import { TeamPage } from "../pages/admin/TeamPage";
import { TeamPageTab } from "../pages/admin/TeamPageTab";
import { TeamMembersTab } from "../pages/admin/TeamMembersTab";
import { TeamDesignTab } from "../pages/admin/TeamDesignTab";
import { ContactPage } from "../pages/admin/ContactPage";
import { GalleryPage } from "../pages/admin/GalleryPage";
import { GalleryItemsTab } from "../pages/admin/GalleryItemsTab";
import { GalleryTagsTab } from "../pages/admin/GalleryTagsTab";
import { GalleryDesignTab } from "../pages/admin/GalleryDesignTab";
import { EventsPage } from "../pages/admin/EventsPage";
import { EventsListTab } from "../pages/admin/EventsListTab";
import { EventsDesignTab } from "../pages/admin/EventsDesignTab";
import { ProtectedRoute } from "./ProtectedRoute";
import { ManageLayout } from "../layouts/ManageLayout";
import { Loading } from "../components";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { NotificationsProvider } from "../features/notifications/NotificationsProvider";

// Admin navigation. `pageName` resolves the i18n label key `${pageName}.menuTitle`
// (see ManageLayout); `menuTitle` is the fallback default message.
const dashboardItem: MenuItem = { menuTitle: "Dashboard", pageName: "manage.dashboard", route: "/manage" };
const siteItem: MenuItem = { menuTitle: "Site configuration", pageName: "manage.siteConfig", route: "/manage/site" };
const teamItem: MenuItem = { menuTitle: "Team", pageName: "manage.team", route: "/manage/team" };
const contactItem: MenuItem = { menuTitle: "Contact", pageName: "manage.contact", route: "/manage/contact" };
const galleryItem: MenuItem = { menuTitle: "Gallery", pageName: "manage.gallery", route: "/manage/gallery" };
const eventsItem: MenuItem = { menuTitle: "Events", pageName: "manage.events", route: "/manage/events" };
const translationsItem: MenuItem = { menuTitle: "Translations", pageName: "manage.translations", route: "/manage/translations" };
const mediaItem: MenuItem = { menuTitle: "Media", pageName: "manage.media", route: "/manage/media" };

// The admin area, once authenticated: Dashboard + Site configuration + Translations
// are always available; the Team, Contact and Media entries/routes are shown only
// when their feature flags are enabled (fetched at runtime from /api/features).
const ManageArea: React.FC = () => {
  const flags = useFeatureFlags();
  if (!flags) return <Loading message="Loading…" />;

  const menuItems: MenuItem[] = [
    dashboardItem,
    siteItem,
    ...(flags.team ? [teamItem] : []),
    ...(flags.contact ? [contactItem] : []),
    ...(flags.gallery ? [galleryItem] : []),
    ...(flags.events ? [eventsItem] : []),
    translationsItem,
    ...(flags.media ? [mediaItem] : []),
  ];

  return (
    <ManageLayout menuItems={menuItems}>
      <Routes>
        <Route index element={<ManagePage />} />
        <Route path="site" element={<SiteConfigPage />}>
          <Route index element={<Navigate to="general" replace />} />
          <Route path="general" element={<GeneralTab />} />
          <Route path="themes" element={<ThemesTab />} />
          <Route path="pages" element={<PagesTab />} />
          <Route path="menu" element={<MenuTab />} />
        </Route>
        {flags.team && (
          <Route path="team" element={<TeamPage />}>
            <Route index element={<Navigate to="page" replace />} />
            <Route path="page" element={<TeamPageTab />} />
            <Route path="members" element={<TeamMembersTab />} />
            <Route path="design" element={<TeamDesignTab />} />
          </Route>
        )}
        {flags.contact && <Route path="contact" element={<ContactPage />} />}
        {flags.gallery && (
          <Route path="gallery" element={<GalleryPage />}>
            <Route index element={<Navigate to="items" replace />} />
            <Route path="items" element={<GalleryItemsTab />} />
            <Route path="tags" element={<GalleryTagsTab />} />
            <Route path="design" element={<GalleryDesignTab />} />
          </Route>
        )}
        {flags.events && (
          <Route path="events" element={<EventsPage />}>
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<EventsListTab />} />
            <Route path="design" element={<EventsDesignTab />} />
          </Route>
        )}
        <Route path="translations" element={<TranslationsPage />} />
        {flags.media && <Route path="media" element={<MediaPage />} />}
      </Routes>
    </ManageLayout>
  );
};

export const ManageRouter: React.FC = () => (
  <ProtectedRoute>
    <NotificationsProvider>
      <ManageArea />
    </NotificationsProvider>
  </ProtectedRoute>
);
