import React from 'react';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { useIntl } from 'react-intl';
import type { TeamMember } from '@simple-site/interfaces';
import { memberSocialEntries } from './teamDisplay';
import { SOCIAL_NETWORK_ICONS } from './socialIcons';

interface SocialLinksRowProps {
  member: TeamMember;
  size?: 'small' | 'medium';
}

/**
 * The member's social icons as a centered row — one icon per provided link, in
 * display order; renders nothing when the member has no links.
 */
export const SocialLinksRow: React.FC<SocialLinksRowProps> = ({ member, size = 'medium' }) => {
  const intl = useIntl();
  const socialEntries = memberSocialEntries(member);
  if (socialEntries.length === 0) return null;

  return (
    <Stack direction="row" spacing={size === 'small' ? 0.5 : 1} justifyContent="center" flexWrap="wrap">
      {socialEntries.map(([network, href]) => {
        const label = intl.formatMessage({ id: `page.team.social.${network}` });
        return (
          <Tooltip key={network} title={label}>
            <IconButton
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              color="primary"
              size={size}
            >
              {SOCIAL_NETWORK_ICONS[network]}
            </IconButton>
          </Tooltip>
        );
      })}
    </Stack>
  );
};
