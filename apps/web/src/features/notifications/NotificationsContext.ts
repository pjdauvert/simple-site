import { createContext } from 'react';

export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

export interface NotificationsContextValue {
  /** Show a notification with an explicit severity and an already-resolved message. */
  notify: (severity: NotificationSeverity, message: string) => void;
  /** Success toast — auto-dismisses after a few seconds. */
  success: (message: string) => void;
  /** Error toast — stays until the user dismisses it. */
  error: (message: string) => void;
  /** Dismiss a notification by id. */
  dismiss: (id: number) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
