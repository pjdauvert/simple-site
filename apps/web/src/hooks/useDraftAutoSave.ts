import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lifecycle of an auto-saved admin form:
 * - `idle`   nothing changed since the editor loaded (or since the last save);
 * - `pending` edits are waiting out the debounce;
 * - `saving` a write is in flight;
 * - `saved`  the last write succeeded;
 * - `error`  the last write failed — the next change retries.
 */
export type DraftSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface DraftSaveState {
  status: DraftSaveStatus;
  /** Message of the last failure, when `status === 'error'`. */
  error: string | null;
  /** Flushes a pending change immediately (e.g. before leaving the tab). */
  saveNow: () => Promise<void>;
}

interface UseDraftAutoSaveOptions<T> {
  /** Current editor state; `null` while the draft loads — never saved. */
  value: T | null;
  /** Persists the value (merge over a fresh draft read, then PUT). */
  save: (value: T) => Promise<void>;
  /** Debounce before writing, in ms. */
  delay?: number;
  /**
   * While false the value is held as `pending` instead of written — used by
   * forms that must not persist an invalid state.
   */
  enabled?: boolean;
}

/** Edits settle for this long before a write goes out. */
export const DRAFT_AUTO_SAVE_DELAY = 800;

/**
 * Auto-saves an admin form to the configuration DRAFT: the editors own no save
 * button any more, every settled change is written on its own. The value the
 * editor loads is the baseline — loading never triggers a write — and saves are
 * serialised, so a change landing mid-write is written right after it (never
 * concurrently, which would make two merges race over the same draft). A change
 * still pending when the editor unmounts is flushed, so switching tab or page
 * never silently drops an edit.
 *
 * Comparison is structural (`JSON.stringify`): editors rebuild their state
 * objects on every render, and re-saving an identical value would spam the API.
 */
export const useDraftAutoSave = <T>({
  value,
  save,
  delay = DRAFT_AUTO_SAVE_DELAY,
  enabled = true,
}: UseDraftAutoSaveOptions<T>): DraftSaveState => {
  const [status, setStatus] = useState<DraftSaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Latest render's inputs, so the debounce timer and the unmount flush always
  // act on current data without re-arming on every keystroke.
  const valueRef = useRef<T | null>(value);
  const saveRef = useRef(save);
  const savedSnapshotRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const hasWrittenRef = useRef(false);
  const failedSnapshotRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  valueRef.current = value;
  saveRef.current = save;

  const flush = useCallback(async (): Promise<void> => {
    const current = valueRef.current;
    if (current === null) return;
    const snapshot = JSON.stringify(current);
    if (snapshot === savedSnapshotRef.current) return;
    if (inFlightRef.current) return; // the running save re-checks when it ends
    inFlightRef.current = true;
    if (mountedRef.current) setStatus('saving');
    let succeeded = false;
    try {
      await saveRef.current(current);
      savedSnapshotRef.current = snapshot;
      failedSnapshotRef.current = null;
      succeeded = true;
      hasWrittenRef.current = true;
      if (mountedRef.current) {
        setError(null);
        setStatus('saved');
      }
    } catch (err) {
      failedSnapshotRef.current = snapshot;
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    } finally {
      inFlightRef.current = false;
      // A change that landed WHILE the write was in flight writes right after
      // it. Only after a success: chaining a retry onto a failure would spin
      // on a server that keeps refusing. A failed value waits for the next edit.
      if (succeeded && mountedRef.current && JSON.stringify(valueRef.current) !== savedSnapshotRef.current) {
        void flush();
      }
    }
  }, []);

  useEffect(() => {
    if (value === null) return;
    const snapshot = JSON.stringify(value);
    // First loaded value is the baseline: it is already what the draft holds.
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = snapshot;
      return;
    }
    // Edited back to what the draft already holds (added then removed again):
    // nothing to write, so the indicator must stop waiting.
    if (snapshot === savedSnapshotRef.current) {
      setStatus((current) => (current === 'pending' ? (hasWrittenRef.current ? 'saved' : 'idle') : current));
      return;
    }
    // The value that just failed must not be retried by a mere re-render:
    // editors that rebuild their value object every render would otherwise
    // re-arm the debounce on the error render and spin. Only a genuinely new
    // value retries.
    if (snapshot === failedSnapshotRef.current) return;
    setStatus('pending');
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, delay, flush]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      // Fire-and-forget: the editor is gone, but the edit must still land.
      void flush();
    },
    [flush],
  );

  return { status, error, saveNow: flush };
};
