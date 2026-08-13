import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import {
  galleryThemePresentationKey,
  galleryThemeScope,
  galleryThemeTitleKey,
} from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading, Markdown } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { displayableItems, galleryDisplaySettings } from './galleryDisplay';
import { GalleryItemList } from './GalleryItemList';

/**
 * Public /gallery/:themeId — one theme explored as a list (see GalleryItemList).
 * Gates itself on the runtime `gallery` flag like the root page. An unknown
 * themeId or a theme with nothing displayable renders the 404 page — the theme
 * only exists publicly through its displayable items, matching its nav behavior.
 */
export const GalleryThemePage: React.FC = () => {
  const flags = useFeatureFlags();
  const siteContext = useSiteConfig();
  const { siteThemeConfig } = useAppTheme();
  const { themeId } = useParams<{ themeId: string }>();
  if (!siteContext) throw new Error('GalleryThemePage must be called within <SiteConfigProvider>');
  const { config } = siteContext;

  if (flags === null) return <Loading />;
  if (!flags.gallery) return <NotFoundPage />;

  const theme = (config.gallery?.themes ?? []).find((t) => t.themeId === themeId);
  const entries = displayableItems(theme?.items);
  if (!theme || entries.length === 0) return <NotFoundPage />;

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
        <FormattedMessage id={galleryThemeTitleKey(theme.themeId)} defaultMessage={theme.title} />
      </Typography>
      {/* The stored presentation is a translation default — per-language values
          from the Translations page take over via the shared key. */}
      {theme.presentation?.trim() && (
        <Box sx={{ mb: { xs: 4, md: 6 }, '& p': { typography: 'body1' }, '& > :first-of-type': { mt: 0 } }}>
          <FormattedMessage id={galleryThemePresentationKey(theme.themeId)} defaultMessage={theme.presentation}>
            {(msg) => <Markdown>{String(msg)}</Markdown>}
          </FormattedMessage>
        </Box>
      )}
      <GalleryItemList
        entries={entries}
        scope={galleryThemeScope(theme.themeId)}
        {...galleryDisplaySettings(config.gallery)}
      />
    </Container>
  );
};
