import React from 'react';
import {
  Facebook as FacebookIcon,
  GitHub as GitHubIcon,
  Instagram as InstagramIcon,
  Language as WebsiteIcon,
  LinkedIn as LinkedInIcon,
  X as XIcon,
  YouTube as YouTubeIcon,
} from '@mui/icons-material';
import type { SocialNetworkId } from '@simple-site/interfaces';

/**
 * Icon per social network (see `SocialNetworksEnum` in `@simple-site/interfaces`
 * — extending the set means adding the icon here). Labels use the
 * `page.team.social.<network>` i18n keys.
 */
export const SOCIAL_NETWORK_ICONS: Record<SocialNetworkId, React.ReactNode> = {
  linkedin: <LinkedInIcon />,
  x: <XIcon />,
  github: <GitHubIcon />,
  instagram: <InstagramIcon />,
  facebook: <FacebookIcon />,
  youtube: <YouTubeIcon />,
  website: <WebsiteIcon />,
};
