import { Box, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { GalleryEditor } from '../../components/manage/gallery';

/**
 * Gallery management (/manage/gallery, flag-gated): organises media-library
 * images into themes. Unlike the team/contact editors this writes the config
 * DRAFT (`PUT /api/config/gallery`) — changes go live only when published from
 * the Config Versions panel on the dashboard.
 */
export const GalleryPage: React.FC = () => (
  <Box sx={{ p: { xs: 2, sm: 4 } }}>
    <Typography variant="h5" gutterBottom>
      <FormattedMessage id="page.manage.gallery.title" />
    </Typography>
    <GalleryEditor />
  </Box>
);
