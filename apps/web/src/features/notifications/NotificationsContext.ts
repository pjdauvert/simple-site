import { createContext } from 'react';

export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

export interface NotifyOptions {
  /**
   * Keeps one slot for a repeating status: a notification posted under a key
   * already on screen is updated in place instead of stacking a new toast.
   * Used by the draft auto-save, which reports every write.
   */
  key?: string;
}

export interface NotificationsContextValue {
  /** Show a notification with an explicit severity and an already-resolved message. */
  notify: (severity: NotificationSeverity, message: string, options?: NotifyOptions) => void;
  /** Success toast — auto-dismisses after a few seconds. */
  success: (message: string, options?: NotifyOptions) => void;
  /** Error toast — stays until the user dismisses it. */
  error: (message: string, options?: NotifyOptions) => void;
  /** Dismiss a notification by id. */
  dismiss: (id: number) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
