import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useNotifications } from './useNotifications';
import type { DraftSaveState } from './useDraftAutoSave';

/**
 * One slot in the notification host for every draft write: the admin edits one
 * tab at a time, and a save is a single running status, not a log.
 */
export const DRAFT_SAVE_NOTIFICATION_KEY = 'draft-auto-save';

/**
 * Reports an auto-saved draft form through the admin notification host — the
 * same toasts as every other admin action, so the editors carry no status
 * widget of their own. Every write reuses one keyed slot, so a long editing
 * session rewrites that single toast instead of stacking one per save:
 * `saving` and `saved` auto-dismiss, a failed write stays until the admin
 * closes it, and `pending`/`idle` say nothing (a waiting debounce is not news).
 *
 * Call it next to {@link useDraftAutoSave} in every DRAFT-backed editor.
 */
export const useDraftSaveNotifications = ({ status, error }: DraftSaveState): void => {
  const { notify } = useNotifications();
  const { formatMessage } = useIntl();

  useEffect(() => {
    const options = { key: DRAFT_SAVE_NOTIFICATION_KEY };
    if (status === 'saving') {
      notify('info', formatMessage({ id: 'page.manage.autoSave.saving' }), options);
    } else if (status === 'saved') {
      notify('success', formatMessage({ id: 'page.manage.autoSave.saved' }), options);
    } else if (status === 'error') {
      notify('error', formatMessage({ id: 'page.manage.autoSave.error' }, { reason: error ?? '' }), options);
    }
  }, [status, error, notify, formatMessage]);
};
