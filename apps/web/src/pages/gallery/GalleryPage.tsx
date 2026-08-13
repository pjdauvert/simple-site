import React from 'react';
import { Box, ButtonBase, Typography, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { FeaturePagesEnum, GALLERY_SCOPE, galleryThemeTitleKey, menuTitleKey } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ikSrcSet, ikTransform } from '../../utils/imagekit';
import {
  displayableItems,
  displayableThemes,
  galleryDisplaySettings,
  galleryPageTitle,
  galleryThemeRoute,
  themeCoverUrl,
} from './galleryDisplay';
import { GalleryItemList } from './GalleryItemList';

/** Delivery buckets for the theme covers (grid cards, 1–3 per row). */
const COVER_WIDTHS = [320, 480, 640, 960] as const;
const COVER_SIZES = '(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw';

/**
 * Public /gallery root. The route is always registered; the page gates itself on
 * the runtime `gallery` flag (flag off → 404, matching the server's behavior) so
 * a direct navigation never flashes the catch-all while flags load. With themes,
 * the root is the theme index (cover cards linking to each theme page); unthemed
 * items are explored right here below — and with NO theme at all, the whole
 * gallery is browsed directly from this page. Nothing displayable → 404.
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
  const themes = displayableThemes(gallery);
  const rootEntries = displayableItems(gallery?.items);
  if (themes.length === 0 && rootEntries.length === 0) return <NotFoundPage />;

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
        <FormattedMessage id={menuTitleKey(FeaturePagesEnum.GALLERY)} defaultMessage={galleryPageTitle(config)} />
      </Typography>

      {themes.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: { xs: 2, md: 3 },
            mb: rootEntries.length > 0 ? { xs: 5, md: 7 } : 0,
          }}
        >
          {themes.map((theme) => {
            const cover = themeCoverUrl(theme);
            return (
              <ButtonBase
                key={theme.themeId}
                component={RouterLink}
                to={galleryThemeRoute(theme.themeId)}
                focusRipple
                sx={{
                  display: 'block',
                  textAlign: 'left',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Box
                  component="img"
                  src={ikTransform(cover ?? '', 'w-640,q-80,f-auto')}
                  srcSet={ikSrcSet(cover ?? '', COVER_WIDTHS)}
                  sizes={COVER_SIZES}
                  loading="lazy"
                  decoding="async"
                  alt=""
                  sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                />
                <Typography variant="h6" component="h2" sx={{ px: 2, py: 1.5 }}>
                  <FormattedMessage id={galleryThemeTitleKey(theme.themeId)} defaultMessage={theme.title} />
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      )}

      {rootEntries.length > 0 && (
        <GalleryItemList entries={rootEntries} scope={GALLERY_SCOPE} {...galleryDisplaySettings(gallery)} />
      )}
    </Container>
  );
};
