import React from 'react';
import { Link, Stack } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { useIntl } from 'react-intl';
import { FormattedMessage } from 'react-intl';
import { eventLocationKey, type SiteEvent } from '@simple-site/interfaces';
import { googleMapsSearchUrl } from './eventDisplay';

/**
 * The event's address as a Google Maps link (new tab). The DISPLAYED address
 * is the translated one; the maps query always uses the stored original —
 * a canonical address geocodes reliably in any interface language.
 */
export const EventLocationLink: React.FC<{ event: SiteEvent }> = ({ event }) => {
  const intl = useIntl();
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
      <PlaceOutlinedIcon fontSize="small" color="action" aria-hidden />
      <Link
        href={googleMapsSearchUrl(event.location)}
        target="_blank"
        rel="noopener noreferrer"
        color="inherit"
        underline="hover"
        title={intl.formatMessage({ id: 'page.events.openMap' })}
        sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, minWidth: 0 }}
      >
        <FormattedMessage id={eventLocationKey(event.slug)} defaultMessage={event.location} />
      </Link>
    </Stack>
  );
};
