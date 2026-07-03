import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Slide, Stack } from '@mui/material';
import { NotificationsContext, type NotificationSeverity } from './NotificationsContext';

type Notification = { id: number; severity: NotificationSeverity; message: string };

/** Success/info toasts auto-dismiss; errors/warnings persist until the user closes them. */
const AUTO_HIDE_MS = 5000;
const autoHides = (severity: NotificationSeverity) => severity === 'success' || severity === 'info';

/**
 * Admin notification host. Exposes `notify`/`success`/`error` and renders a stack of
 * MUI Alerts that slide up from the bottom-left. Newer messages stack on top of older
 * ones (oldest at the bottom); success auto-dismisses, errors stay until closed.
 *
 * Scoped to the admin area (wrapped in `ManageRouter`), so the public site is unaffected.
 */
export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Notification[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback((severity: NotificationSeverity, message: string) => {
    const id = (idRef.current += 1);
    setItems((prev) => [...prev, { id, severity, message }]); // chronological: oldest first
    if (autoHides(severity)) {
      timers.current.set(id, setTimeout(() => dismiss(id), AUTO_HIDE_MS));
    }
  }, [dismiss]);

  const value = useMemo(() => ({
    notify,
    success: (message: string) => notify('success', message),
    error: (message: string) => notify('error', message),
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
            left: 24,
            right: { xs: 24, sm: 'auto' },
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
