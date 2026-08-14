import React from 'react';
import { Container, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { FeaturePagesEnum, menuTitleKey } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { displayableItems, galleryDisplaySettings, galleryPageTitle } from './galleryDisplay';
import { GalleryItemList } from './GalleryItemList';

/**
 * Public /gallery root: the whole gallery browsed as one list (tags never
 * partition the root — a tag's collection is its own page at
 * `/gallery/tag/<tag>`, linked from the menu by the admin). The route is always
 * registered; the page gates itself on the runtime `gallery` flag (flag off →
 * 404, matching the server's behavior) so a direct navigation never flashes
 * the catch-all while flags load. Nothing displayable → 404.
 */
export const GalleryPage: React.FC = () => {
  const flags = useFeatureFlags();
  const siteContext = useSiteConfig();
  const { siteThemeConfig } = useAppTheme();
  if (!siteContext) throw new Error('GalleryPage must be called within <SiteConfigProvider>');
  const { config } = siteContext;

  if (flags === null) return <Loading />;
  if (!flags.gallery) return <NotFoundPage />;

  const gallery = config.gallery;
  const entries = displayableItems(gallery?.items);
  if (entries.length === 0) return <NotFoundPage />;

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
        <FormattedMessage id={menuTitleKey(FeaturePagesEnum.GALLERY)} defaultMessage={galleryPageTitle(config)} />
      </Typography>
      <GalleryItemList entries={entries} {...galleryDisplaySettings(gallery)} />
    </Container>
  );
};
