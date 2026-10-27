import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Slide, Stack } from '@mui/material';
import { NotificationsContext, type NotificationSeverity, type NotifyOptions } from './NotificationsContext';

type Notification = { id: number; severity: NotificationSeverity; message: string; key?: string };

/** Success/info toasts auto-dismiss; errors/warnings persist until the user closes them. */
const AUTO_HIDE_MS = 5000;
const autoHides = (severity: NotificationSeverity) => severity === 'success' || severity === 'info';

/**
 * Admin notification host. Exposes `notify`/`success`/`error` and renders a stack of
 * MUI Alerts that slide up from the bottom-right. Newer messages stack on top of older
 * ones (oldest at the bottom); success auto-dismisses, errors stay until closed.
 *
 * A notification posted with a `key` owns a single slot: posting that key again
 * rewrites the toast already on screen (same position, auto-hide re-armed) instead
 * of stacking another one, so a status that repeats — the draft auto-save reporting
 * every write — reads as one line that changes.
 *
 * Scoped to the admin area (wrapped in `ManageRouter`), so the public site is unaffected.
 */
export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Notification[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const keyedIds = useRef(new Map<string, number>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    keyedIds.current.forEach((keyed, key) => {
      if (keyed === id) keyedIds.current.delete(key);
    });
  }, []);

  const notify = useCallback((severity: NotificationSeverity, message: string, options?: NotifyOptions) => {
    const { key } = options ?? {};
    // A keyed notification reuses its own id, so the Alert updates in place
    // instead of unmounting and sliding in again.
    const existingId = key ? keyedIds.current.get(key) : undefined;
    const id = existingId ?? (idRef.current += 1);
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    if (key) keyedIds.current.set(key, id);
    setItems((prev) =>
      prev.some((n) => n.id === id)
        ? prev.map((n) => (n.id === id ? { ...n, severity, message } : n))
        : [...prev, { id, severity, message, key }], // chronological: oldest first
    );
    if (autoHides(severity)) {
      timers.current.set(id, setTimeout(() => dismiss(id), AUTO_HIDE_MS));
    }
  }, [dismiss]);

  const value = useMemo(() => ({
    notify,
    success: (message: string, options?: NotifyOptions) => notify('success', message, options),
    error: (message: string, options?: NotifyOptions) => notify('error', message, options),
    dismiss,
  }), [notify, dismiss]);

  // Clear any pending auto-dismiss timers when the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {items.length > 0 && (
        <Stack
          spacing={1}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            left: { xs: 24, sm: 'auto' },
            width: { xs: 'auto', sm: 420 },
            zIndex: (theme) => theme.zIndex.snackbar,
            // column-reverse keeps the oldest at the bottom and stacks newer ones on top.
            flexDirection: 'column-reverse',
          }}
        >
          {items.map((n) => (
            <Slide key={n.id} direction="up" in mountOnEnter>
              <Alert
                severity={n.severity}
                variant="filled"
                elevation={6}
                onClose={() => dismiss(n.id)}
                sx={{ width: '100%' }}
              >
                {n.message}
              </Alert>
            </Slide>
          ))}
        </Stack>
      )}
    </NotificationsContext.Provider>
  );
};
