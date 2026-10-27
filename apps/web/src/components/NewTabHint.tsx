import { Box } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { FormattedMessage } from 'react-intl';

/**
 * Appends "(opens in a new tab)" to a link's accessible name, for links that
 * carry `target="_blank"`.
 *
 * A sighted visitor sees the new tab appear; a screen-reader user gets no
 * warning at all, and arrives somewhere their back button no longer returns
 * from. The hint is therefore **visually hidden rather than an `aria-label`**:
 * an `aria-label` would REPLACE the visible text, so the accessible name and
 * the rendered label would drift apart — bad for speech-control users, who say
 * what they read. Rendered inside the link, it simply extends what is already
 * announced.
 *
 * Drop it inside the `<Link>` / `<Button>`, after the visible label.
 */
export const NewTabHint: React.FC = () => (
  <Box component="span" sx={visuallyHidden}>
    {' '}
    <FormattedMessage id="a11y.opensInNewTab" />
  </Box>
);
