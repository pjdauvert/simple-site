import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { useDraftSaveNotifications } from './useDraftSaveNotifications';
import type { DraftSaveState, DraftSaveStatus } from './useDraftAutoSave';

const state = (status: DraftSaveStatus, error: string | null = null): DraftSaveState => ({
  status,
  error,
  saveNow: vi.fn(),
});

const Probe: React.FC<{ state: DraftSaveState }> = ({ state: value }) => {
  useDraftSaveNotifications(value);
  return null;
};

const render = (initial: DraftSaveState) =>
  renderWithProviders(<Probe state={initial} />, { notifications: true });

describe('useDraftSaveNotifications', () => {
  afterEach(() => vi.useRealTimers());

  it('says nothing while the draft is untouched or an edit is still waiting', () => {
    const { rerender } = render(state('idle'));
    rerender(<Probe state={state('pending')} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports a write and then its success in one slot', () => {
    const { rerender } = render(state('saving'));
    expect(screen.getByText('Saving to draft…')).toBeInTheDocument();

    rerender(<Probe state={state('saved')} />);
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1); // the same toast, rewritten
    expect(alerts[0]).toHaveTextContent('Saved to draft');
  });

  it('keeps a failure on screen with its reason', () => {
    vi.useFakeTimers();
    render(state('error', 'offline'));
    expect(screen.getByText('Could not save: offline')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText('Could not save: offline')).toBeInTheDocument();
  });

  it('replaces a failure with the next successful write', () => {
    const { rerender } = render(state('error', 'offline'));
    rerender(<Probe state={state('saving')} />);
    rerender(<Probe state={state('saved')} />);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('Saved to draft')).toBeInTheDocument();
  });
});
