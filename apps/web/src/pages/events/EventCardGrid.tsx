import React from 'react';
import { Box } from '@mui/material';
import type { SiteEvent } from '@simple-site/interfaces';
import type { ResolvedAgendaDesign } from './eventDisplay';
import { eventColumnsSx } from './eventDisplay';
import { EventCard } from './EventCard';

/** The agenda's responsive card grid (upcoming and past sections alike). */
export const EventCardGrid: React.FC<{ events: readonly SiteEvent[]; design: ResolvedAgendaDesign }> = ({
  events,
  design,
}) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: eventColumnsSx(design.columns), gap: 2 }}>
    {events.map((event) => (
      <EventCard
        key={event.slug}
        event={event}
        aspectRatio={design.cardAspectRatio}
        showLocation={design.showLocationOnCards}
      />
    ))}
  </Box>
);
