import React from 'react';
import { Box, Container, Link, Typography } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import {
  DEFAULT_GALLERY_ALL_LABEL,
  FEATURE_PAGE_ROUTES,
  GALLERY_ALL_NAME_KEY,
  galleryTagDescriptionKey,
  galleryTagNameKey,
} from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading, Markdown } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { displayableItemsForTag, galleryDisplaySettings } from './galleryDisplay';
import { GalleryItemList } from './GalleryItemList';

/**
 * Public /gallery/tag/:tag — one tag's collection: the gallery items carrying
 * the tag, browsed like the root list (see GalleryItemList), headed by the
 * tag's displayName and optional description. Gates itself on the runtime
 * `gallery` flag like the root page. An unknown tag or a collection with
 * nothing displayable renders the 404 page — a tag only exists publicly
 * through its displayable items, matching its menu-entry behavior.
 */
export const GalleryTagPage: React.FC = () => {
  const flags = useFeatureFlags();
  const siteContext = useSiteConfig();
  const { siteThemeConfig } = useAppTheme();
  const { tag: tagParam } = useParams<{ tag: string }>();
  if (!siteContext) throw new Error('GalleryTagPage must be called within <SiteConfigProvider>');
  const { config } = siteContext;

  if (flags === null) return <Loading />;
  if (!flags.gallery) return <NotFoundPage />;

  const tag = (config.gallery?.tags ?? []).find((candidate) => candidate.tag === tagParam);
  const entries = tag ? displayableItemsForTag(config.gallery, tag.tag) : [];
  if (!tag || entries.length === 0) return <NotFoundPage />;

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      {/* Back to the general gallery — same translatable label as the
          submenu's "all items" link. */}
      <Link
        component={RouterLink}
        to={FEATURE_PAGE_ROUTES.gallery}
        variant="body2"
        color="text.secondary"
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1 }}
      >
        <BackIcon fontSize="inherit" />
        <FormattedMessage id={GALLERY_ALL_NAME_KEY} defaultMessage={DEFAULT_GALLERY_ALL_LABEL} />
      </Link>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
        <FormattedMessage id={galleryTagNameKey(tag.tag)} defaultMessage={tag.displayName} />
      </Typography>
      {/* The stored description is a translation default — per-language values
          from the Translations page take over via the shared key. */}
      {tag.description?.trim() && (
        <Box sx={{ mb: { xs: 4, md: 6 }, '& p': { typography: 'body1' }, '& > :first-of-type': { mt: 0 } }}>
          <FormattedMessage id={galleryTagDescriptionKey(tag.tag)} defaultMessage={tag.description}>
            {(msg) => <Markdown>{String(msg)}</Markdown>}
          </FormattedMessage>
        </Box>
      )}
      <GalleryItemList entries={entries} {...galleryDisplaySettings(config.gallery)} />
    </Container>
  );
};
