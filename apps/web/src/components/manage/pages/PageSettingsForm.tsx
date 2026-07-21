import { Box, TextField } from '@mui/material';
import { useIntl } from 'react-intl';
import type { PageConfiguration } from '@simple-site/interfaces';
import type { PageFieldErrors } from './pagesDraft';

interface PageSettingsFormProps {
  page: PageConfiguration;
  errors: PageFieldErrors;
  showErrors: boolean;
  onChange: (next: PageConfiguration) => void;
  /** When true (the home page), the route and pageName can't be changed. */
  lockIdentity?: boolean;
}

const ROUTE_ERROR: Record<NonNullable<PageFieldErrors['route']>, string> = {
  empty: 'page.manage.pages.error.routeEmpty',
  duplicate: 'page.manage.pages.error.routeDuplicate',
};
const PAGENAME_ERROR: Record<NonNullable<PageFieldErrors['pageName']>, string> = {
  empty: 'page.manage.pages.error.pageNameEmpty',
  duplicate: 'page.manage.pages.error.pageNameDuplicate',
  pattern: 'page.manage.pages.error.pageNamePattern',
};

/** Editor for a page's structural fields: menu title, i18n page name, and route. */
export const PageSettingsForm: React.FC<PageSettingsFormProps> = ({ page, errors, showErrors, onChange, lockIdentity }) => {
  const intl = useIntl();
  const set = (key: keyof PageConfiguration, value: string) => onChange({ ...page, [key]: value });

  const routeError = showErrors && errors.route ? errors.route : undefined;
  const pageNameError = showErrors && errors.pageName ? errors.pageName : undefined;
  const lockedHelp = intl.formatMessage({ id: 'page.manage.pages.field.homeLocked' });

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <TextField
        label={intl.formatMessage({ id: 'page.manage.pages.field.menuTitle' })}
        value={page.menuTitle}
        onChange={(e) => set('menuTitle', e.target.value)}
        size="small"
        fullWidth
      />
      <TextField
        label={intl.formatMessage({ id: 'page.manage.pages.field.route' })}
        value={page.route}
        onChange={(e) => set('route', e.target.value)}
        size="small"
        fullWidth
        required
        disabled={lockIdentity}
        error={Boolean(routeError)}
        helperText={routeError ? intl.formatMessage({ id: ROUTE_ERROR[routeError] }) : lockIdentity ? lockedHelp : ' '}
      />
      <TextField
        label={intl.formatMessage({ id: 'page.manage.pages.field.pageName' })}
        value={page.pageName}
        onChange={(e) => set('pageName', e.target.value)}
        size="small"
        fullWidth
        required
        disabled={lockIdentity}
        error={Boolean(pageNameError)}
        helperText={
          pageNameError
            ? intl.formatMessage({ id: PAGENAME_ERROR[pageNameError] })
            : lockIdentity
              ? lockedHelp
              : intl.formatMessage({ id: 'page.manage.pages.field.pageName.help' })
        }
      />
    </Box>
  );
};
