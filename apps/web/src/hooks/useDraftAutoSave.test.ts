import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDraftAutoSave } from './useDraftAutoSave';

describe('useDraftAutoSave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Advances past the debounce and lets the save promise settle. */
  const settle = async (ms = 900) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  it('never writes the value the editor loaded (that is already the draft)', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(({ value }) => useDraftAutoSave({ value, save }), {
      initialProps: { value: { title: 'A' } as { title: string } | null },
    });
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('writes a settled change once, debounced', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ value }) => useDraftAutoSave({ value, save }), {
      initialProps: { value: { title: 'A' } },
    });

    rerender({ value: { title: 'B' } });
    expect(result.current.status).toBe('pending');
    rerender({ value: { title: 'C' } }); // keystroke before the debounce elapses
    expect(save).not.toHaveBeenCalled();

    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ title: 'C' });
    expect(result.current.status).toBe('saved');
  });

  it('ignores a re-render that rebuilds an identical value', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ value }) => useDraftAutoSave({ value, save }), {
      initialProps: { value: { title: 'A' } },
    });
    rerender({ value: { title: 'A' } }); // new object, same content
    await settle();
    expect(save).not.toHaveBeenCalled();
  });

  it('holds the change as pending while disabled (invalid form), then writes once enabled', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value, enabled }) => useDraftAutoSave({ value, save, enabled }),
      { initialProps: { value: { title: 'A' }, enabled: false } },
    );
    rerender({ value: { title: 'B' }, enabled: false });
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('pending');

    rerender({ value: { title: 'B' }, enabled: true });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('writes again when an edit lands while the previous write is in flight', async () => {
    let release: (() => void) | undefined;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }))
      .mockResolvedValue(undefined);
    const { rerender } = renderHook(({ value }) => useDraftAutoSave({ value, save }), {
      initialProps: { value: { title: 'A' } },
    });

    rerender({ value: { title: 'B' } });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);

    // Edited mid-write: the hook must not write concurrently…
    rerender({ value: { title: 'C' } });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);

    // …but writes the newest value as soon as the first write lands.
    await act(async () => {
      release?.();
    });
    expect(save).toHaveBeenNthCalledWith(2, { title: 'C' });
  });

  it('reports a failed write and never retries it on its own (no spin)', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ value }) => useDraftAutoSave({ value, save }), {
      initialProps: { value: { title: 'A' } },
    });

    rerender({ value: { title: 'B' } });
    await settle();
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('offline');
    expect(save).toHaveBeenCalledTimes(1); // no self-retry loop

    // The next edit retries.
    rerender({ value: { title: 'C' } });
    await settle();
    expect(result.current.status).toBe('saved');
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('does not retry a failed write when the editor rebuilds its value on re-render', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    // Mirrors an editor whose `value` is an object literal: every render — the
    // error render included — hands the hook a new reference, same content.
    const { result, rerender } = renderHook(({ title }) => useDraftAutoSave({ value: { title }, save }), {
      initialProps: { title: 'A' },
    });

    rerender({ title: 'B' });
    await settle();
    expect(result.current.status).toBe('error');
    expect(save).toHaveBeenCalledTimes(1);

    // Re-renders with the same content must not re-arm the debounce.
    rerender({ title: 'B' });
    rerender({ title: 'B' });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);

    // A genuinely new value retries.
    rerender({ title: 'C' });
    await settle();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('stops waiting when an edit is undone back to the saved state', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ value }) => useDraftAutoSave({ value, save }), {
      initialProps: { value: { title: 'A' } },
    });

    // Never written yet: undoing goes back to a silent indicator.
    rerender({ value: { title: 'B' } });
    expect(result.current.status).toBe('pending');
    rerender({ value: { title: 'A' } });
    expect(result.current.status).toBe('idle');
    await settle();
    expect(save).not.toHaveBeenCalled();

    // After a real write, undoing a later edit settles back to "saved".
    rerender({ value: { title: 'C' } });
    await settle();
    expect(result.current.status).toBe('saved');
    rerender({ value: { title: 'D' } });
    expect(result.current.status).toBe('pending');
    rerender({ value: { title: 'C' } });
    expect(result.current.status).toBe('saved');
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flushes a pending change when the editor unmounts', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender, unmount } = renderHook(({ value }) => useDraftAutoSave({ value, save }), {
      initialProps: { value: { title: 'A' } },
    });
    rerender({ value: { title: 'B' } });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(save).toHaveBeenCalledWith({ title: 'B' });
  });

  it('drops — never writes — a change the form holds back as invalid when it unmounts', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender, unmount } = renderHook(
      ({ value, enabled }) => useDraftAutoSave({ value, save, enabled }),
      { initialProps: { value: { title: 'A' }, enabled: true } },
    );
    rerender({ value: { title: '' }, enabled: false }); // a required field emptied

    await act(async () => {
      unmount();
    });
    // The server would refuse it, and the editor is gone to report the failure.
    expect(save).not.toHaveBeenCalled();
  });
});
