import React from 'react';
import { Box, Chip, Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { FeaturePagesEnum, galleryTagNameKey, menuTitleKey } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import {
  displayableItems,
  displayableTags,
  galleryDisplaySettings,
  galleryPageTitle,
  galleryTagRoute,
} from './galleryDisplay';
import { GalleryItemList } from './GalleryItemList';

/**
 * Public /gallery root: the whole gallery browsed as one list (tags never
 * partition the root — a tag's collection is its own page at
 * `/gallery/tag/<tag>`). This GENERAL page is where tags surface visually: a
 * tag bar under the heading and discreet chips on each item, all navigating to
 * the collections (the collection pages themselves stay chip-free). The route
 * is always registered; the page gates itself on the runtime `gallery` flag
 * (flag off → 404, matching the server's behavior) so a direct navigation
 * never flashes the catch-all while flags load. Nothing displayable → 404.
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
  // Only tags with a displayable collection — their pages would 404 otherwise.
  const tags = displayableTags(gallery);

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h3" component="h1" gutterBottom>
        <FormattedMessage id={menuTitleKey(FeaturePagesEnum.GALLERY)} defaultMessage={galleryPageTitle(config)} />
      </Typography>
      {tags.length > 0 && (
        <Box data-testid="gallery-tag-bar" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {tags.map((tag) => (
            <Chip
              key={tag.tag}
              clickable
              component={RouterLink}
              to={galleryTagRoute(tag.tag)}
              label={<FormattedMessage id={galleryTagNameKey(tag.tag)} defaultMessage={tag.displayName} />}
            />
          ))}
        </Box>
      )}
      <Box sx={{ mt: { xs: 3, md: 5 } }}>
        <GalleryItemList entries={entries} tags={tags} {...galleryDisplaySettings(gallery)} />
      </Box>
    </Container>
  );
};
