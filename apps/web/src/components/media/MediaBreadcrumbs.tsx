import { Breadcrumbs, Link, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';

interface MediaBreadcrumbsProps {
  /** Path segments of the current folder, relative to the root (e.g. ["products", "2024"]). */
  segments: string[];
  /** Navigate to a folder path ("" for the root). */
  onNavigate: (path: string) => void;
}

/** Breadcrumb trail from the root ("Home") down to the current folder. */
export const MediaBreadcrumbs: React.FC<MediaBreadcrumbsProps> = ({ segments, onNavigate }) => (
  <Breadcrumbs sx={{ mb: 2 }}>
    <Link
      component="button"
      type="button"
      underline="hover"
      color={segments.length === 0 ? 'text.primary' : 'inherit'}
      onClick={() => onNavigate('')}
    >
      <FormattedMessage id="page.media.root" />
    </Link>
    {segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const isLast = index === segments.length - 1;
      return isLast ? (
        <Typography key={path} color="text.primary">{segment}</Typography>
      ) : (
        <Link
          key={path}
          component="button"
          type="button"
          underline="hover"
          color="inherit"
          onClick={() => onNavigate(path)}
        >
          {segment}
        </Link>
      );
    })}
  </Breadcrumbs>
);
